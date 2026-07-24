import { isWorkspaceProject, } from '@doist/todoist-sdk';
import chalk from 'chalk';
import { Option } from 'commander';
import { getApi, getCurrentUserId } from '../lib/api/core.js';
import { formatUserShortName } from '../lib/collaborators.js';
import { withCaseInsensitiveChoices } from '../lib/completion.js';
import { CURSOR_DESCRIPTION } from '../lib/constants.js';
import { CliError } from '../lib/errors.js';
import { formatPaginatedJson, formatPaginatedNdjson } from '../lib/output.js';
import { paginate } from '../lib/pagination.js';
import { extractId, isIdRef, resolveProjectId } from '../lib/refs.js';
const ACTIVITY_LIMIT = 100;
const EVENT_COLORS = {
    added: chalk.green,
    completed: chalk.green,
    updated: chalk.yellow,
    deleted: chalk.red,
    uncompleted: chalk.yellow,
    archived: chalk.gray,
    unarchived: chalk.cyan,
    shared: chalk.magenta,
    left: chalk.gray,
    reordered: chalk.cyan,
    moved: chalk.cyan,
};
const OBJECT_TYPE_LABELS = {
    task: 'task',
    item: 'task',
    comment: 'comment',
    note: 'comment',
    project: 'project',
};
const EVENT_CHOICES = Object.keys(EVENT_COLORS);
const OBJECT_TYPE_CHOICES = [...new Set(Object.values(OBJECT_TYPE_LABELS))];
function formatEventType(eventType) {
    const colorFn = EVENT_COLORS[eventType] || chalk.white;
    return colorFn(eventType.padEnd(11));
}
function formatObjectType(objectType) {
    const label = OBJECT_TYPE_LABELS[objectType] || objectType;
    return chalk.dim(label.padEnd(8));
}
function formatEventDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return chalk.dim(`${month}-${day} ${hours}:${minutes}`);
}
function getEventContent(event) {
    const extra = event.extraData;
    if (extra?.content) {
        return String(extra.content);
    }
    if (extra?.name) {
        return String(extra.name);
    }
    if (extra?.last_content) {
        return String(extra.last_content);
    }
    if (extra?.last_name) {
        return String(extra.last_name);
    }
    return `id:${event.objectId}`;
}
function truncateContent(content, maxLength = 100) {
    const firstLine = content.split('\n')[0];
    if (firstLine.length <= maxLength) {
        return firstLine;
    }
    return `${firstLine.slice(0, maxLength - 3)}...`;
}
function formatActivityRow(event, projectName, initiatorName, showInitiator = false) {
    const date = formatEventDate(event.eventDate);
    const eventType = formatEventType(event.eventType);
    const objectType = formatObjectType(event.objectType);
    const content = getEventContent(event);
    const metaParts = [date, eventType, objectType];
    if (projectName) {
        metaParts.push(chalk.cyan(projectName));
    }
    if (showInitiator && initiatorName) {
        metaParts.push(chalk.magenta(`by ${initiatorName}`));
    }
    const line1 = `  ${metaParts.join('  ')}`;
    const line2 = `    ${truncateContent(content)}`;
    return `${line1}\n${line2}`;
}
function normalizeInlineText(text) {
    return text.replace(/\s+/g, ' ').trim();
}
function formatMarkdownDay(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function formatMarkdownTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}
function formatActivityMarkdown(events, projects, userNames, nextCursor) {
    const sortedEvents = [...events].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
    const lines = ['# Activity Log'];
    let currentDay = null;
    for (const event of sortedEvents) {
        const day = formatMarkdownDay(event.eventDate);
        if (day !== currentDay) {
            lines.push('', `## ${day}`, '');
            currentDay = day;
        }
        const objectType = OBJECT_TYPE_LABELS[event.objectType] || event.objectType;
        const content = normalizeInlineText(getEventContent(event));
        const parts = [
            `- ${formatMarkdownTime(event.eventDate)} - ${event.eventType} ${objectType}: ${content}`,
        ];
        if (event.parentProjectId) {
            const projectName = projects.get(event.parentProjectId)?.name;
            if (projectName) {
                parts.push(`(project: ${normalizeInlineText(projectName)})`);
            }
        }
        if (event.initiatorId && userNames.size > 0) {
            const fullName = userNames.get(event.initiatorId);
            if (fullName) {
                parts.push(`(by: ${normalizeInlineText(formatUserShortName(fullName))})`);
            }
        }
        lines.push(parts.join(' '));
    }
    if (nextCursor) {
        lines.push('', '> Note: More items exist. Use --cursor to paginate, or narrow results with --since/--until.');
    }
    return lines.join('\n');
}
export function registerActivityCommand(program) {
    program
        .command('activity')
        .description('View activity logs')
        .option('--since <date>', 'Start date (YYYY-MM-DD)')
        .option('--until <date>', 'End date (YYYY-MM-DD)')
        .addOption(withCaseInsensitiveChoices(new Option('--type <type>', 'Filter by object type (task, comment, project)'), OBJECT_TYPE_CHOICES))
        .addOption(withCaseInsensitiveChoices(new Option('--event <type>', 'Filter by event type'), EVENT_CHOICES))
        .option('--project <name>', 'Filter by project')
        .option('--by <user>', 'Filter by initiator (use "me" for yourself)')
        .option('--limit <n>', `Limit results (default: ${ACTIVITY_LIMIT})`)
        .option('--cursor <cursor>', CURSOR_DESCRIPTION)
        .option('--markdown', 'Output as raw Markdown')
        .option('--json', 'Output as JSON')
        .option('--ndjson', 'Output as newline-delimited JSON')
        .option('--full', 'Include all fields in JSON output')
        .action(async (options) => {
        const selectedOutputFormats = [options.markdown, options.json, options.ndjson].filter(Boolean).length;
        if (selectedOutputFormats > 1) {
            throw new CliError('CONFLICTING_OPTIONS', 'Options --markdown, --json, and --ndjson are mutually exclusive.');
        }
        const api = await getApi();
        let projectId;
        if (options.project) {
            projectId = await resolveProjectId(api, options.project);
        }
        let initiatorId;
        if (options.by) {
            if (options.by.toLowerCase() === 'me') {
                initiatorId = await getCurrentUserId();
            }
            else if (isIdRef(options.by)) {
                initiatorId = extractId(options.by);
            }
            else {
                initiatorId = options.by;
            }
        }
        const targetLimit = options.limit ? parseInt(options.limit, 10) : ACTIVITY_LIMIT;
        const { results: events, nextCursor } = await paginate(async (cursor, limit) => {
            const objectEventTypes = options.type || options.event
                ? `${options.type ?? ''}:${options.event ?? ''}`
                : undefined;
            const resp = await api.getActivityLogs({
                dateFrom: options.since ? new Date(options.since) : undefined,
                dateTo: options.until ? new Date(options.until) : undefined,
                objectEventTypes,
                parentProjectId: projectId,
                initiatorId,
                cursor: cursor ?? undefined,
                limit,
            });
            return { results: resp.results, nextCursor: resp.nextCursor };
        }, { limit: targetLimit, startCursor: options.cursor });
        if (options.json) {
            console.log(formatPaginatedJson({ results: events, nextCursor }, undefined, options.full));
            return;
        }
        if (options.ndjson) {
            console.log(formatPaginatedNdjson({ results: events, nextCursor }, undefined, options.full));
            return;
        }
        if (events.length === 0) {
            if (options.markdown) {
                const lines = ['# Activity Log'];
                if (nextCursor) {
                    lines.push('', '> Note: More items exist. Use --cursor to paginate, or narrow results with --since/--until.');
                }
                console.log(lines.join('\n'));
                return;
            }
            console.log('No activity found.');
            if (nextCursor) {
                console.log(chalk.dim('\n... more items exist. Use --cursor to paginate, or narrow results with --since/--until.'));
            }
            return;
        }
        const { results: allProjects } = await api.getProjects();
        const projects = new Map(allProjects.map((p) => [p.id, p]));
        const workspaceIds = new Set();
        for (const event of events) {
            if (!event.parentProjectId)
                continue;
            const proj = projects.get(event.parentProjectId);
            if (proj && isWorkspaceProject(proj)) {
                workspaceIds.add(proj.workspaceId);
            }
        }
        const userNames = new Map();
        for (const wsId of workspaceIds) {
            let cursor;
            while (true) {
                const response = await api.getWorkspaceUsers({
                    workspaceId: wsId,
                    cursor,
                    limit: 200,
                });
                for (const user of response.workspaceUsers) {
                    userNames.set(user.userId, user.fullName);
                }
                if (!response.hasMore || !response.nextCursor)
                    break;
                cursor = response.nextCursor;
            }
        }
        if (options.markdown) {
            console.log(formatActivityMarkdown(events, projects, userNames, nextCursor));
            return;
        }
        console.log(chalk.bold(`Activity (${events.length})`));
        console.log('');
        for (const event of events) {
            const projectName = event.parentProjectId
                ? projects.get(event.parentProjectId)?.name
                : undefined;
            let initiatorName = null;
            if (event.initiatorId && userNames.size > 0) {
                const fullName = userNames.get(event.initiatorId);
                if (fullName) {
                    initiatorName = formatUserShortName(fullName);
                }
            }
            console.log(formatActivityRow(event, projectName, initiatorName, userNames.size > 0));
            console.log('');
        }
        if (nextCursor) {
            console.log(chalk.dim('\n... more items exist. Use --cursor to paginate, or narrow results with --since/--until.'));
        }
    });
}
//# sourceMappingURL=activity.js.map
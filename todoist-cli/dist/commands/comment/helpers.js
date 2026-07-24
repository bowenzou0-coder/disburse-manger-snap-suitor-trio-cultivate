export function truncateContent(content, maxLines) {
    const lines = content.split('\n');
    if (lines.length <= maxLines)
        return content;
    return `${lines.slice(0, maxLines).join('\n')}\n...`;
}
//# sourceMappingURL=helpers.js.map
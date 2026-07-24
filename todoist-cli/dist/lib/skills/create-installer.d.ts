import type { SkillInstaller } from './types.js';
interface InstallerConfig {
    name: string;
    description: string;
    dirName: string;
    globalDirName?: string;
}
export declare function generateSkillFile(): string;
export declare function createInstaller(config: InstallerConfig): SkillInstaller;
export {};
//# sourceMappingURL=create-installer.d.ts.map
import { existsSync, readFileSync, writeFileSync } from "fs";

export function modifyEnv(key: string, value: string) {
    const envPath = `${process.cwd()}/.env`;
    if (!existsSync(envPath)) {
        writeFileSync(envPath, `${key}=${value}\n`);
    } else {
        const env = readFileSync(envPath, 'utf8');
        const lines = env.split('\n');
        let found = false;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith(key)) {
                lines[i] = `${key}=${value}`;
                found = true;
                break;
            }
        }
        if (!found) {
            lines.push(`${key}=${value}`);
        }
        writeFileSync(envPath, lines.join('\n'));
    }
}

export function deleteEnv(key: string) {
    const envPath = `${process.cwd()}/.env`;
    if (!existsSync(envPath)) {
        return;
    } else {
        const env = readFileSync(envPath, 'utf8');
        const lines = env.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith(key)) {
                lines.splice(i, 1);
                break;
            }
        }
        writeFileSync(envPath, lines.join('\n'));
    }
}
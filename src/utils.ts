/*
  * Copyright (c) 2025 Inimi | InimicalPart | Incoverse
  *
  * This program is free software: you can redistribute it and/or modify
  * it under the terms of the GNU General Public License as published by
  * the Free Software Foundation, either version 3 of the License, or
  * (at your option) any later version.
  *
  * This program is distributed in the hope that it will be useful,
  * but WITHOUT ANY WARRANTY; without even the implied warranty of
  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  * GNU General Public License for more details.
  *
  * You should have received a copy of the GNU General Public License
  * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

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
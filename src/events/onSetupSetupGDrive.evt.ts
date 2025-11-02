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

import IBEEPEvent, { EventInfo, TakesBroadcasterSender } from "@src/lib/base/IBEEPEvent.js";
import { readFileSync } from "fs";
import { JWT } from "google-auth-library";

declare const global: IBEEPGlobal;

const GSERVICE_PATH = global.contained ? "/ibeepdata/gservice.json" : "gservice.json";

export default class OSSGD extends IBEEPEvent {

    public eventTrigger: (params: TakesBroadcasterSender) => EventInfo = ({broadcaster, sender}) => ({
        type: "InimiBEEP:start",
        priority: 0
    })


    public async setup(): Promise<boolean> {
        global.logger("Initiating GDrive...", "info")

        let gCreds: { client_email: any; private_key: any; };
        try {
            gCreds = JSON.parse(readFileSync(GSERVICE_PATH, "utf8"))
        } catch (e) {
            global.logger("Failed to read Google Service Account credentials. Please ensure gservice.json is present and valid.", "error", "GDrive-Setup")
            return false
        }

        const gScopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
        ];
        
        const gJWT = new JWT({
            email: gCreds.client_email,
            key: gCreds.private_key,
            scopes: gScopes,
        });

        global.additional.googleCredentials = gJWT
        global.additional.gDriveReady = true
        global.logger(`GDrive initialized`, "info")
        global.commChannel.emit("gdrive:ready")
        
        return super.setup()
    }

    public async exec(): Promise<void> {}
}
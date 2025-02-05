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

import IBEEPEvent, { EventInfo, TakesBroadcasterSender, TwitchEventInfo } from "@src/lib/base/IBEEPEvent.js";
import { convertAllToID } from "@src/lib/misc.js";
import { CronJob } from "cron";
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from "google-spreadsheet";

declare const global: IBEEPGlobal;


export default class OGDRPRS extends IBEEPEvent {
    public eventTrigger: (params: TakesBroadcasterSender) => EventInfo = ({broadcaster, sender}) => ({
        type: "InimiBEEP:start",
        priority: 0
    })

    private doc: GoogleSpreadsheet
    private sheet: GoogleSpreadsheetWorksheet
    private bannedRaidIDs: string[]

    public async exec(data?: {event: any}): Promise<void> {
        global.logger("Preparing random raid sheet... " + global.additional.gDriveReady, "info")
        if (!global.additional.gDriveReady) {
            global.commChannel.once("gdrive:ready", async () => {
                global.logger("GDrive is ready, preparing random raid sheet...", "info")
                this.exec(data)
            })
            return
        }
        global.logger("Running", "info")

        this.bannedRaidIDs = [
            global.broadcaster.SELF.id, //! Broadcaster
            "100135110" //! StreamElements
        ]

        this.doc = new GoogleSpreadsheet(process.env.RANDOMRAID_SHEET, global.additional.googleCredentials);
        await this.doc.loadInfo(true);
        this.sheet = this.doc.sheetsByIndex[0]
        global.additional.randomRaidSheet = this.sheet
        global.additional.randomRaidDoc = this.doc
        global.additional.randomRaidBannedIDs = this.bannedRaidIDs

        global.logger(`Found ${(await this.sheet.getRows()).length} entries in the random raid sheet!`) 

        await this.doc.loadInfo(true);
        await convertAllToID()

        new CronJob("0/30 * * * *", async () => {
            await this.doc.loadInfo(true);
            await convertAllToID()
        }).start();
        
    }




}
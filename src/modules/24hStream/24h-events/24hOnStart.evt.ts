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

import IBEEPEvent, { EventInfo } from "@src/lib/base/IBEEPEvent.js";
import Twitch from "@src/twitch.js";

declare const global: IBEEPGlobal

export default class TFHStreamInitiator extends IBEEPEvent {
    public eventTrigger: (params: { broadcaster: Twitch; sender: Twitch; }) => EventInfo = ({broadcaster, sender}) => ({
        type: "InimiBEEP:start",
        priority: 999
    });
    
    public async exec(): Promise<void> {
        global.additional.pushups = 0;
        global.additional.availability = {
            chip: true,
            drink: true,
            nugget: true,
            chili: true
        }
    }
}
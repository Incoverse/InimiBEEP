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

export default class CacheManager {

    private cache: Map<string, { expires: Date, value: any }>;

    constructor(cache: Map<string, { expires: Date, value: any }> = new Map()) {
        this.cache = cache;
    }

    get(key: string) {
        if (!this.cache.has(key)) return null;
        if (this.cache.get(key).expires.getTime() < Date.now()) {
            this.cache.delete(key);
            return null;
        }
        return this.cache.get(key).value;
    }

    has(key: any): boolean {
        const entry = this.cache.get(key)
        if (!entry) return false

        if (entry.expires.getTime() < Date.now()) {
            this.cache.delete(key)
            return false
        }

        return true
    }
    
    clear(): void {
        return this.cache.clear()
    }

    delete(key: any): boolean {
        return this.cache.delete(key)
    }

    entries(): IterableIterator<[any, any]> {
        const entires = this.cache.entries()

        for (const [key, value] of entires) {
            if (value.expires.getTime() < Date.now()) {
                this.cache.delete(key)
            }
        }

        // only return the key, and value, not the expires
        return (function* () {
            for (const [key, value] of entires) {
                yield [key, value.value];
            }
        })();
    }

    forEach(callbackfn: (value: any, key: any) => void): void {
        this.cache.forEach((value, key) => {
            if (value.expires.getTime() < Date.now()) {
                this.cache.delete(key)
                return
            }

            callbackfn(value.value, key)
        })
    }

    keys(): IterableIterator<string> {
        const keys = this.cache.keys()

        for (const key of keys) {
            if (this.cache.get(key).expires.getTime() < Date.now()) {
                this.cache.delete(key)
            }
        }

        return keys
    }

    set(key: any, value: any, expires: number | Date): this {
        this.cache.set(key, { value, expires: expires instanceof Date ? expires : new Date(Date.now() + expires) })
        return this
    }

    public cacheize() {
        return this.cache
    }
}
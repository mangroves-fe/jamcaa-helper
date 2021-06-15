import { JamcaaHelper } from './jamcaa-helper'

export const createJamcaaHelper = <Entity>(entity: Entity) => {
  return new JamcaaHelper()
}

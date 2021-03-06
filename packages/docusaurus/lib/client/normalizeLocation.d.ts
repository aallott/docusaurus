/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
declare type Location = {
    pathname: string;
};
declare function normalizeLocation<T extends Location>(location: T): T;
export default normalizeLocation;
//# sourceMappingURL=normalizeLocation.d.ts.map
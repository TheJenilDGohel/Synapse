import { ITaxonomyService } from '../../../interfaces/services.js';
import type { Adapter } from '../types/index.js';
import {
  listNests as listNestsFn,
  listBranches as listBranchesFn,
  getTaxonomyTree as getTaxonomyTreeFn,
  manageBranches as manageBranchesFn
} from './taxonomy.js';

export class TaxonomyService implements ITaxonomyService {
  constructor(private adapter: Adapter) {}

  async listNests() {
    return listNestsFn(this.adapter);
  }

  async listBranches(nest: string) {
    return listBranchesFn(this.adapter, nest);
  }

  async getTaxonomyTree() {
    return getTaxonomyTreeFn(this.adapter);
  }

  async manageBranches(args: any) {
    return manageBranchesFn(this.adapter, args);
  }
}

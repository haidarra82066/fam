import { describe, it, expect } from 'vitest';
import { deriveRelationships } from '../deriveRelationship';
import { deriveRelationshipsFromDbRows } from '../dbRows';
import { KinshipInput } from '../types';

const mk = (): KinshipInput => ({
  focusPersonId: 'me',
  persons: [
    { id: 'me', sex: 'male' }, { id: 'mom', sex: 'female' }, { id: 'dad', sex: 'male' }, { id: 'sis', sex: 'female' },
    { id: 'halfbro', sex: 'male' }, { id: 'gma', sex: 'female' }, { id: 'gpa', sex: 'male' }, { id: 'son', sex: 'male' },
    { id: 'dau', sex: 'female' }, { id: 'sp', sex: 'female' }, { id: 'ex', sex: 'female' }, { id: 'unc', sex: 'male' },
    { id: 'aunt', sex: 'female' }, { id: 'neph', sex: 'male' }, { id: 'niec', sex: 'female' }, { id: 'c1', sex: 'female' },
    { id: 'c2', sex: 'male' }, { id: 'c1r', sex: 'female' }, { id: 'stepmom', sex: 'female' }, { id: 'stepkid', sex: 'male' },
    { id: 'sil', sex: 'female' }, { id: 'unknown' }, { id: 'bro', sex: 'male' }, { id: 'ggma', sex: 'female' },
    { id: 'gson', sex: 'male' }, { id: 'ggdau', sex: 'female' }, { id: 'spdad', sex: 'male' }, { id: 'spmom', sex: 'female' },
    { id: 'spbro', sex: 'male' }, { id: 'sonsWife', sex: 'female' }, { id: 'copar' }, { id: 'sep' }, { id: 'div' },
    { id: 'donorDad', sex: 'male' }, { id: 'surrogateMom', sex: 'female' },
  ],
  unions: [
    { id: 'u1', partner_1_id: 'dad', partner_2_id: 'mom', status: 'spouse' },
    { id: 'u2', partner_1_id: 'me', partner_2_id: 'sp', status: 'spouse' },
    { id: 'u3', partner_1_id: 'me', partner_2_id: 'ex', status: 'ex-partner' },
    { id: 'u4', partner_1_id: 'dad', partner_2_id: 'stepmom', status: 'spouse' },
    { id: 'u5', partner_1_id: 'sis', partner_2_id: 'sil', status: 'spouse' },
    { id: 'u6', partner_1_id: 'son', partner_2_id: 'sonsWife', status: 'married' },
    { id: 'u7', partner_1_id: 'me', partner_2_id: 'copar', status: 'co_parent' },
    { id: 'u8', partner_1_id: 'me', partner_2_id: 'sep', status: 'separated' },
    { id: 'u9', partner_1_id: 'me', partner_2_id: 'div', status: 'divorced' },
  ],
  parent_child_relationships: [
    { id: 'p1', parent_id: 'mom', child_id: 'me', relation_type: 'biological' },
    { id: 'p2', parent_id: 'dad', child_id: 'me', relation_type: 'biological' },
    { id: 'p2a', parent_id: 'donorDad', child_id: 'me', relation_type: 'donor' },
    { id: 'p2b', parent_id: 'surrogateMom', child_id: 'me', relation_type: 'surrogate' },
    { id: 'p3', parent_id: 'mom', child_id: 'sis', relation_type: 'biological' },
    { id: 'p4', parent_id: 'dad', child_id: 'sis', relation_type: 'biological' },
    { id: 'p4a', parent_id: 'mom', child_id: 'bro', relation_type: 'biological' },
    { id: 'p4b', parent_id: 'dad', child_id: 'bro', relation_type: 'biological' },
    { id: 'p5', parent_id: 'dad', child_id: 'halfbro', relation_type: 'biological' },
    { id: 'p6', parent_id: 'unknown', child_id: 'halfbro', relation_type: 'biological' },
    { id: 'p7', parent_id: 'gma', child_id: 'dad', relation_type: 'biological' },
    { id: 'p8', parent_id: 'gpa', child_id: 'dad', relation_type: 'biological' },
    { id: 'p8a', parent_id: 'ggma', child_id: 'gma', relation_type: 'biological' },
    { id: 'p9', parent_id: 'gma', child_id: 'unc', relation_type: 'biological' },
    { id: 'p10', parent_id: 'gpa', child_id: 'unc', relation_type: 'biological' },
    { id: 'p11', parent_id: 'unc', child_id: 'c1', relation_type: 'biological' },
    { id: 'p12', parent_id: 'aunt', child_id: 'c1', relation_type: 'biological' },
    { id: 'p13', parent_id: 'me', child_id: 'son', relation_type: 'biological' },
    { id: 'p14', parent_id: 'sp', child_id: 'son', relation_type: 'biological' },
    { id: 'p15', parent_id: 'me', child_id: 'dau', relation_type: 'adoptive' },
    { id: 'p16', parent_id: 'sp', child_id: 'dau', relation_type: 'adoptive' },
    { id: 'p17', parent_id: 'sis', child_id: 'neph', relation_type: 'biological' },
    { id: 'p18', parent_id: 'sil', child_id: 'neph', relation_type: 'biological' },
    { id: 'p19', parent_id: 'sis', child_id: 'niec', relation_type: 'biological' },
    { id: 'p20', parent_id: 'sil', child_id: 'niec', relation_type: 'biological' },
    { id: 'p21', parent_id: 'c1', child_id: 'c1r', relation_type: 'biological' },
    { id: 'p22', parent_id: 'sp', child_id: 'stepkid', relation_type: 'biological' },
    { id: 'p23', parent_id: 'son', child_id: 'gson', relation_type: 'biological' },
    { id: 'p24', parent_id: 'gson', child_id: 'ggdau', relation_type: 'biological' },
    { id: 'p25', parent_id: 'spdad', child_id: 'sp', relation_type: 'biological' },
    { id: 'p26', parent_id: 'spmom', child_id: 'sp', relation_type: 'biological' },
    { id: 'p27', parent_id: 'spdad', child_id: 'spbro', relation_type: 'biological' },
    { id: 'p28', parent_id: 'spmom', child_id: 'spbro', relation_type: 'biological' },
  ],
});

const label = (id: string) => deriveRelationships(mk())[id].relationship_label;

describe('kinship labels', () => {
  it('covers >30 scenarios', () => {
    expect(label('me')).toBe('self');
    expect(label('mom')).toBe('mother');
    expect(label('dad')).toBe('father');
    expect(label('donorDad')).toBe('donor father');
    expect(label('surrogateMom')).toBe('surrogate mother');
    expect(label('bro')).toBe('brother');
    expect(label('sis')).toBe('sister');
    expect(label('halfbro')).toBe('half brother');
    expect(label('gma')).toBe('grandmother');
    expect(label('gpa')).toBe('grandfather');
    expect(label('ggma')).toBe('great-grandmother');
    expect(label('son')).toBe('son');
    expect(label('dau')).toBe('adoptive daughter');
    expect(label('gson')).toBe('grandson');
    expect(label('ggdau')).toBe('great-granddaughter');
    expect(label('sp')).toBe('spouse');
    expect(label('ex')).toBe('ex-partner');
    expect(label('copar')).toBe('co-parent');
    expect(label('sep')).toBe('separated partner');
    expect(label('div')).toBe('divorced partner');
    expect(label('unc')).toBe('uncle');
    expect(label('aunt')).toBe('aunt');
    expect(label('neph')).toBe('nephew');
    expect(label('niec')).toBe('niece');
    expect(label('c1')).toBe('first cousin');
    expect(label('c1r')).toBe('first cousin once removed');
    expect(label('stepmom')).toBe('step parent');
    expect(label('stepkid')).toBe('step child');
    expect(label('sil')).toBe('sister-in-law');
    expect(label('spdad')).toBe('father-in-law');
    expect(label('spbro')).toBe('brother-in-law');
    expect(label('sonsWife')).toBe('daughter-in-law');
    expect(label('unknown')).toBe('relative');
    const rels = deriveRelationships(mk());
    expect(rels.mom.generation_delta).toBe(1);
    expect(rels.son.generation_delta).toBe(-1);
    expect(rels.gpa.generation_delta).toBe(2);
    expect(rels.me.confidence).toBe(1);
    expect(rels.unknown.confidence).toBeLessThan(0.5);
    expect(rels.c1.relationship_path.length).toBeGreaterThanOrEqual(3);
    expect(rels.sil.relationship_path).toContain('sis');
    expect(rels.stepmom.confidence).toBeGreaterThan(0.7);
    expect(rels.stepkid.confidence).toBeGreaterThan(0.7);
    expect(rels.c1r.relationship_label.includes('removed')).toBe(true);
    expect(rels.halfbro.relationship_label.startsWith('half')).toBe(true);
  });

  it('derives labels from DB row shapes, including placeholder-parent siblings', () => {
    const rels = deriveRelationshipsFromDbRows({
      focusPersonId: 'me',
      persons: [
        { id: 'me', display_name: 'Me', gender: 'female' },
        { id: 'bro', display_name: 'Brother', gender: 'male' },
        { id: 'placeholder', display_name: 'Unknown parent' },
      ],
      unions: [],
      parentChild: [
        { id: 'pc1', parent_id: 'placeholder', child_id: 'me', parent_role: 'unknown' },
        { id: 'pc2', parent_id: 'placeholder', child_id: 'bro', parent_role: 'unknown' },
      ],
    });

    expect(rels.bro.relationship_label).toBe('half brother');
  });
});

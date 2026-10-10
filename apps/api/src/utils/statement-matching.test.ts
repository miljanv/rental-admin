import { describe, expect, it } from 'vitest';
import { canonicalBankAccount, uniqueStatementNameMatch } from './statement-matching';

const names = (name: string): string[] => [name];
describe('statement counterparty matching', () => {
  it('matches formatted domestic accounts including omitted leading zeroes', () => {
    expect(canonicalBankAccount('160-12345-67')).toBe(canonicalBankAccount('160000000001234567'));
    expect(canonicalBankAccount(' 160 - 0000000012345 - 67 ')).toBe(
      canonicalBankAccount('160-12345-67'),
    );
  });
  it('matches names without diacritics and ignores letter case', () => {
    expect(uniqueStatementNameMatch(['Đorđević DOO'], 'DJORDJEVIC DOO', names)).toBe(
      'Đorđević DOO',
    );
  });
  it('prefers exact names and refuses ambiguous partial matches', () => {
    expect(uniqueStatementNameMatch(['Dunav', 'Dunav prevoz'], 'Dunav prevoz', names)).toBe(
      'Dunav prevoz',
    );
    expect(
      uniqueStatementNameMatch(['Dunav', 'Dunav prevoz'], 'Dunav prevoz DOO Novi Sad', names),
    ).toBeNull();
  });
  it('matches Serbian Cyrillic and short whole names without substring false positives', () => {
    expect(uniqueStatementNameMatch(['Dunav prevoz'], 'ДУНАВ ПРЕВОЗ ДОО', names)).toBe(
      'Dunav prevoz',
    );
    expect(uniqueStatementNameMatch(['NIS'], 'NIS AD NOVI SAD', names)).toBe('NIS');
    expect(uniqueStatementNameMatch(['NIS'], 'TENIS KLUB', names)).toBeNull();
  });
  it('retains unknown and empty counterparties for manual matching', () => {
    expect(uniqueStatementNameMatch(['Dunav'], 'unknown', names)).toBeNull();
    expect(uniqueStatementNameMatch(['Dunav'], null, names)).toBeNull();
  });
});

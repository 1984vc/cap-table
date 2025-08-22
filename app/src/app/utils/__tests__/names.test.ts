import { describe, expect, it } from '@jest/globals';
import { generateDockerStyleName } from '../names';

describe('names', () => {
  describe('generateDockerStyleName', () => {
    it('should generate deterministic names from UUIDs', () => {
      // Test that the same UUID always produces the same name
      const uuid1 = '123e4567-e89b-12d3-a456-426614174000';
      const name1 = generateDockerStyleName(uuid1);
      const name2 = generateDockerStyleName(uuid1);
      
      expect(name1).toBe(name2);
    });

    it('should generate different names from different UUIDs', () => {
      const uuid1 = '123e4567-e89b-12d3-a456-426614174000';
      const uuid2 = '123e4567-e89b-12d3-a456-426614174001';
      
      const name1 = generateDockerStyleName(uuid1);
      const name2 = generateDockerStyleName(uuid2);
      
      expect(name1).not.toBe(name2);
    });

    it('should generate names in the correct format', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const name = generateDockerStyleName(uuid);
      
      // Should contain exactly one space
      expect(name.split(' ').length).toBe(2);
      
      // Should not be empty
      expect(name.length).toBeGreaterThan(0);
    });

    it('should handle various UUID formats', () => {
      const testUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'abcdef12-3456-7890-abcd-ef1234567890',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff'
      ];
      
      testUUIDs.forEach(uuid => {
        const name = generateDockerStyleName(uuid);
        expect(name).toBeDefined();
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it('should use both adjectives and surnames arrays', () => {
      // Test with a UUID that should produce valid indices
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const name = generateDockerStyleName(uuid);
      const parts = name.split(' ');
      
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });
  });
});

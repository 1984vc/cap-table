const prefix = [
  "Aurora", "Meridian", "Cascade", "Pinnacle", "Nexus", "Vertex", "Axiom", "Quantum", "Stellar", "Prism", "Zenith", "Apex", "Echo", "Nova", "Flux", "Vector", "Cipher", "Matrix", "Vortex", "Phoenix", "Titan", "Atlas", "Cosmos", "Orbit", "Nebula", "Galaxy", "Solar", "Lunar", "Cosmic", "Radiant", "Brilliant", "Crystal", "Diamond", "Platinum", "Golden", "Silver", "Crimson", "Scarlet", "Azure", "Cobalt", "Emerald", "Jade", "Amber", "Ruby", "Sapphire", "Onyx", "Marble", "Granite", "Steel", "Iron", "Copper", "Bronze", "Thunder", "Lightning", "Storm", "Tempest", "Cyclone", "Hurricane", "Tsunami", "Avalanche", "Glacier", "Mountain", "Canyon", "Valley", "Forest"
]

const suffix = [
  "Ventures", "Capital", "Partners", "Holdings", "Group", "Systems", "Technologies", "Solutions", "Analytics", "Intelligence", "Networks", "Dynamics", "Labs", "Studios", "Works", "Industries", "Enterprises", "Innovations", "Consulting", "Associates", "Collective", "Alliance", "Research", "Development", "Engineering", "Platforms", "Frameworks", "Infrastructure", "Architecture", "Services", "Resources", "Operations", "Security", "Performance", "Optimization", "Integration", "Automation", "Computing", "Digital", "Cloud", "Data", "Insights", "Metrics", "Standards", "Protocols", "Interfaces", "Components", "Modules", "Libraries", "Utilities", "Tools", "Software", "Hardware", "Firmware", "Applications", "Programs", "Algorithms", "Databases", "Storage", "Processing", "Management", "Administration", "Governance", "Compliance"
]

/**
 * Generates a deterministic hash from a UUID string
 * @param uuid - The UUID string to hash
 * @returns A numeric hash value
 */
function hashUUID(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generates a Docker-style [Adjective] [Surname] name using a UUID as seed
 * @param uuid - The UUID string from the URL
 * @returns A string in the format "adjective surname"
 */
export function generateDockerStyleName(uuid: string): string {
  // Convert UUID to a numeric seed
  const seed = hashUUID(uuid);
  
  // Use modulo to select adjective and surname
  const adjectiveIndex = seed % prefix.length;
  const surnameIndex = (seed >> 8) % suffix.length; // Shift bits for different distribution
  
  const adjective = prefix[adjectiveIndex];
  const surname = suffix[surnameIndex];
  
  return `${adjective} ${surname}`;
}

const { execSync } = require('child_process');
const fs = require('fs');

function checkFile(filePath) {
  try {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
      return { valid: true };
    }

    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const opens = (content.match(/[\(\[\{]/g) || []).length;
      const closes = (content.match(/[\)\]\}]/g) || []).length;
      if (Math.abs(opens - closes) > 10) {
        return { valid: false, error: `Bracket mismatch: ${opens} open vs ${closes} close` };
      }
      // Check for obviously truncated files
      if (content.length < 50) {
        return { valid: false, error: 'File appears empty or truncated' };
      }
      return { valid: true };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.stderr?.toString() || err.message };
  }
}

function checkAndRevertBadFiles(patchResults) {
  let allValid = true;

  for (const patch of patchResults) {
    if (!patch.patched || !patch.filePath) continue;

    const { valid, error } = checkFile(patch.filePath);

    if (!valid) {
      allValid = false;
      console.error(`  SYNTAX ERROR in ${patch.filePath}: ${error}`);
      try {
        execSync(`git checkout HEAD -- "${patch.filePath}"`, { stdio: 'pipe' });
        console.error(`  Auto-reverted to last good version`);
        patch.patched = false;
        patch.reverted = true;
        patch.revertReason = error;
      } catch (revertErr) {
        console.error(`  Could not revert: ${revertErr.message}`);
      }
    }
  }

  return allValid;
}

module.exports = { checkAndRevertBadFiles };
import fs from 'fs';
import path from 'path';

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath, fileList);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const ROOT = path.join(process.cwd(), 'src');
const allFiles = walk(ROOT);

let foundError = false;

for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const regex = /import\s+.*?from\s+['"](\.[^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const importPath = match[1];
        const dir = path.dirname(file);
        const resolvedPathBase = path.join(dir, importPath);

        // try to find the actual case of this path
        const parts = importPath.split('/');
        let currentDir = dir;
        let validSoFar = true;

        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                currentDir = path.dirname(currentDir);
                continue;
            }

            if (!fs.existsSync(currentDir)) break;
            const dirContents = fs.readdirSync(currentDir);

            // Check exact match first
            let matched = dirContents.find(d => d === part);

            // If not found, it might be omitting the extension
            if (!matched && (part.indexOf('.') === -1)) {
                matched = dirContents.find(d =>
                    d === part + '.js' ||
                    d === part + '.jsx' ||
                    d === part + '.css'
                );

                // If it's a directory, maybe it resolves to index.js
                if (!matched) {
                    const exactDir = dirContents.find(d => d === part);
                    if (exactDir && fs.statSync(path.join(currentDir, exactDir)).isDirectory()) {
                        matched = exactDir;
                    }
                }
            }

            if (!matched) {
                // Now check case INsensitive match
                const lowerMatched = dirContents.find(d => d.toLowerCase() === part.toLowerCase());
                if (lowerMatched) {
                    const lowerMatchedWithExt = dirContents.find(d =>
                        d.toLowerCase() === part.toLowerCase() + '.js' ||
                        d.toLowerCase() === part.toLowerCase() + '.jsx'
                    );
                    console.log(`❌ CASE MISMATCH in ${file}`);
                    console.log(`   Import is: '${importPath}'`);
                    console.log(`   Expected: '${lowerMatched || lowerMatchedWithExt}' instead of '${part}'`);
                    foundError = true;
                    validSoFar = false;
                    break;
                }
            }
            if (matched) {
                currentDir = path.join(currentDir, matched);
            } else {
                validSoFar = false;
                break;
            }
        }
    }
}

if (!foundError) {
    console.log("✅ All local imports have correct casing!");
}

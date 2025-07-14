#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixExtensions(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            fixExtensions(filePath);
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            // Check if it's actually a JavaScript file
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('import') || content.includes('export') || content.includes('function')) {
                const newPath = filePath.replace(/\.ts$/, '.js');
                fs.renameSync(filePath, newPath);
                console.log(`Renamed: ${file} -> ${path.basename(newPath)}`);
                
                // Update references in HTML files
                updateHtmlReferences(dir, file, path.basename(newPath));
            }
        }
    }
}

function updateHtmlReferences(dir, oldFile, newFile) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            updateHtmlReferences(filePath, oldFile, newFile);
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(filePath, 'utf8');
            const oldRef = `/assets/${oldFile}`;
            const newRef = `/assets/${newFile}`;

            if (content.includes(oldRef)) {
                content = content.replace(new RegExp(oldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newRef);
                fs.writeFileSync(filePath, content);
                console.log(`Updated references in: ${file}`);
            }
        }
    }
}

// Run the fix
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
    console.log('Fixing file extensions...');
    fixExtensions(distDir);
    console.log('Done!');
} else {
    console.error('dist directory not found');
}

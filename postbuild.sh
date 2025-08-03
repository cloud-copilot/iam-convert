cat >dist/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF
rm -rf dist/cjs/util/readPackageFileEsm.*
rm -rf dist/cjs/util/workerScriptEsm.*

cat >dist/esm/package.json <<!EOF
{
    "type": "module"
}
!EOF

mv dist/esm/util/readPackageFileEsm.js dist/esm/util/readPackageFile.js
mv dist/esm/util/readPackageFileEsm.d.ts dist/esm/util/readPackageFile.d.ts
mv dist/esm/util/readPackageFileEsm.js.map dist/esm/util/readPackageFile.js.map
mv dist/esm/util/readPackageFileEsm.d.ts.map dist/esm/util/readPackageFile.d.ts.map

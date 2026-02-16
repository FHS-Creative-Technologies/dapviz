# load locally built dapviz binary into extension directory
extension_dev: extension_deps server_build
    -mkdir editor/visual-studio-code/bin
    cp server/src-backend/target/release/dapviz editor/visual-studio-code/bin/aarch64-apple-darwin_dapviz
    code editor/visual-studio-code

[working-directory: 'server']
server_dev: server_deps
    pnpm dev

[working-directory: 'server']
server_deps:
    pnpm install

[working-directory: 'editor/visual-studio-code']
extension_deps:
    npm install

[working-directory: 'server']
server_build: server_deps
    pnpm build

clean:
    -rm -rf editor/visual-studio-code/bin
    -rm -rf editor/visual-studio-code/dist
    -rm -rf editor/visual-studio-code/node_modules
    -rm -rf server/src-backend/target
    -rm -rf server/dist
    -rm -rf server/node_modules

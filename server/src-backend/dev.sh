#/bin/sh
RUST_LOG="debug" LOG_OUTPUT="stderr" cargo run -- -p 8080 --language c-sharp ../../playground/csharp/bin/Debug/net9.0/csharp.dll


use std::{io::Write as _, path::PathBuf, sync::LazyLock};

use anyhow::Context as _;
use async_trait::async_trait;
use clap::ValueEnum;
use serde::Serialize;

#[derive(Serialize, Debug, Clone, PartialEq, Eq, PartialOrd, Ord, ValueEnum)]
pub enum DebugAdapter {
    #[value(name = "netcoredbg")]
    NetCoreDbg,
}

#[async_trait]
pub(crate) trait DebugAdapterFunctions {
    async fn download(&self) -> anyhow::Result<PathBuf>;
    fn get_executable_path(&self) -> Option<PathBuf>;
}

enum DownloadMethod {
    GitHubRelease {
        repository_id: &'static str,
        release_tag: &'static str,
        asset_name: &'static str,
    },
}

pub static DATA_BASE_DIR: LazyLock<PathBuf> = LazyLock::new(|| {
    let mut base_dir = dirs::data_local_dir().expect("unsupported platform");
    base_dir.push("dapviz");

    if !std::fs::exists(&base_dir).expect("could not read application data folder") {
        std::fs::create_dir(&base_dir).expect("could not create folder for application data");
    }

    base_dir
});

pub struct DebugAdapterInstallDefinition {
    adapter_name: &'static str,
    download: DownloadMethod,
    executable_name: &'static str,
}

#[derive(serde::Deserialize, Debug)]
struct GitHubReleaseAsset {
    name: String,
    browser_download_url: String,
}

#[derive(serde::Deserialize, Debug)]
struct GitHubReleaseResponse {
    tag_name: String,
    assets: Vec<GitHubReleaseAsset>,
}

#[async_trait]
impl DebugAdapterFunctions for DebugAdapterInstallDefinition {
    async fn download(&'_ self) -> anyhow::Result<PathBuf> {
        match self.download {
            DownloadMethod::GitHubRelease {
                repository_id,
                release_tag,
                asset_name,
            } => {
                let release_url = format!(
                    "https://api.github.com/repos/{}/releases/{}",
                    repository_id, release_tag
                );

                let release = reqwest::Client::builder()
                    .user_agent("dapviz")
                    .build()?
                    .get(release_url)
                    .send()
                    .await?
                    .error_for_status()?
                    .json::<GitHubReleaseResponse>()
                    .await?;

                tracing::info!("Found release {}", release.tag_name);

                let release_asset = release
                    .assets
                    .iter()
                    .find(|asset| asset.name == asset_name)
                    .with_context(|| {
                        format!("could not find {asset_name} in release {release_tag}")
                    })?;

                let mut destination_file = DATA_BASE_DIR.to_owned();
                destination_file.push(self.adapter_name);

                let mut installation_dir = destination_file.clone();

                if !std::fs::exists(&installation_dir)? {
                    std::fs::create_dir(&installation_dir)?;
                }

                destination_file.push(&release_asset.name);

                tracing::info!(
                    "Downloading {} to {}",
                    &release_asset.name,
                    destination_file.display()
                );

                let data = reqwest::Client::builder()
                    .user_agent("dapviz")
                    .build()?
                    .get(&release_asset.browser_download_url)
                    .send()
                    .await?
                    .error_for_status()?
                    .bytes()
                    .await?;

                let mut file = std::fs::File::create(&destination_file)?;
                file.write_all(&data)?;

                let installation_dir_arg = installation_dir.to_str().with_context(|| {
                    format!(
                        "installation directory is not valid utf-8: {}",
                        installation_dir.display()
                    )
                })?;

                let archive_arg = destination_file.to_str().with_context(|| {
                    format!(
                        "installation directory is not valid utf-8: {}",
                        installation_dir.display()
                    )
                })?;

                // NOTE: surprisingly, tar also is on windows since win10. fancy
                let mut command = tokio::process::Command::new("tar");
                command.args(["-x", "-f", archive_arg, "-C", installation_dir_arg]);

                let exit_code = command.spawn()?.wait().await?;
                if !exit_code.success() {
                    anyhow::bail!("unzipping downloaded archive was unsuccessful");
                }

                installation_dir.push(self.executable_name);

                Ok(installation_dir)
            }
        }
    }

    fn get_executable_path(&self) -> Option<PathBuf> {
        let mut install_path = DATA_BASE_DIR.to_owned();
        install_path.push(self.adapter_name);
        install_path.push(self.executable_name);

        install_path.exists().then_some(install_path)
    }
}

pub const NET_CORE_DBG_INSTALL: DebugAdapterInstallDefinition = DebugAdapterInstallDefinition {
    adapter_name: "netcoredbg",
    download: DownloadMethod::GitHubRelease {
        repository_id: "Samsung/netcoredbg",
        release_tag: "latest",
        #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
        asset_name: "netcoredbg-linux-amd64.tar.gz",
        #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
        asset_name: "netcoredbg-linux-arm64.tar.gz",
        #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
        asset_name: "netcoredbg-osx-amd64.tar.gz",
        #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
        asset_name: "netcoredbg-osx-amd64.tar.gz",
        #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
        asset_name: "netcoredbg-win64.zip",
    },
    #[cfg(not(target_os = "windows"))]
    executable_name: "netcoredbg/netcoredbg",
    #[cfg(target_os = "windows")]
    executable_name: "netcoredbg/netcoredbg.exe",
};

#[async_trait]
impl DebugAdapterFunctions for DebugAdapter {
    async fn download(&self) -> anyhow::Result<PathBuf> {
        match self {
            DebugAdapter::NetCoreDbg => NET_CORE_DBG_INSTALL.download().await,
        }
    }

    fn get_executable_path(&self) -> Option<PathBuf> {
        match self {
            DebugAdapter::NetCoreDbg => NET_CORE_DBG_INSTALL.get_executable_path(),
        }
    }
}

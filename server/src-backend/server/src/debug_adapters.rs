use std::{io::Write as _, path::PathBuf, sync::LazyLock};

use anyhow::Context as _;
use clap::ValueEnum;
use serde::Serialize;

#[derive(Serialize, Debug, Clone, PartialEq, Eq, PartialOrd, Ord, ValueEnum)]
pub enum DebugAdapter {
    #[value(name = "netcoredbg")]
    NetCoreDbg,
}

pub(crate) trait DebugAdapterFunctions {
    async fn download(&self) -> anyhow::Result<Box<dyn Future<Output = PathBuf>>>;
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

impl DebugAdapterFunctions for DebugAdapterInstallDefinition {
    async fn download(&self) -> anyhow::Result<Box<dyn Future<Output = PathBuf>>> {
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

                let mut download_dir = DATA_BASE_DIR.to_owned();
                download_dir.push(self.adapter_name);

                tracing::info!(
                    "Downloading {} into {}",
                    &release_asset.name,
                    download_dir.display()
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

                let mut file = std::fs::File::create(&download_dir)?;
                file.write_all(&data)?;

                Ok(Box::new(std::future::ready(download_dir)))
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
        asset_name: "netcoredbg-osx-amd64.tar.gz",
    },
    executable_name: "netcoredbg",
};

impl DebugAdapterFunctions for DebugAdapter {
    async fn download(&self) -> anyhow::Result<Box<dyn Future<Output = PathBuf>>> {
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

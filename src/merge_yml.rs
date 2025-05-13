use log::{trace, info, debug, error};
use walkdir::WalkDir;
use yaml_hash::YamlHash;
use anyhow::{Context, Error, Result};

#[derive(Debug, Clone)]
pub struct ConfigData<'a> {
    pub merged_data: YamlHash,
    config_paths_with_priority: Vec<&'a str>,
}

impl<'a> ConfigData<'a> {
    pub fn new(config_paths_with_priority: Vec<&'a str>) -> Self {
        Self {
            merged_data: YamlHash::new(),
            config_paths_with_priority,
        }
    }
    pub fn load_and_merge(&mut self) -> Result<(), Error> {
        info!("Loading config...");
        for path in self.config_paths_with_priority.clone() {
            info!("Merging data from path: {}", path);
            self.merge_one(path)?;
        }
        debug!("CONFIG: {:?}", self.merged_data);
        Ok(())
    }
    pub fn merge_one(&mut self, path: &str) -> Result<(), Error> {
        let yaml_files = match get_yaml_files_in_folder(path) {
            Ok(files) => files,
            Err(e) => {
                error!("Error getting YAML files in folder: {}", e);
                return Err(e);
            }
        };
        trace!("YAML files: {:?}", yaml_files);
        for yaml_file in yaml_files {
            info!("Merging file: {:?}", yaml_file);
            self.merged_data = self.merged_data.merge_file(&yaml_file)?;
        }
        
        Ok(())
    }
}

// Function to recursively get all YAML files in a folder
fn get_yaml_files_in_folder(folder_path: &str) -> Result<Vec<String>, Error> {
    let mut yaml_files = Vec::new();
    for entry in WalkDir::new(folder_path) {
        let entry = entry?;
        if entry.file_type().is_file() {
            let yaml_files_exist = entry.path().extension()
                .is_some_and(|ext| ext == "yaml" || ext == "yml");
            if yaml_files_exist {
                let path = entry.path().to_str().context("Failed to convert yaml file path to string")?.to_string();
                trace!("Found YAML file: {}", path);
                yaml_files.push(path);
            }
            else {
                trace!("Skipping directory: {:?}", entry.path().to_str());
                return Err(anyhow::anyhow!("Skipping directory: {:?}", entry.path().to_str()));
            }
        }
    }
    info!("Files to load found in folder {}: {}", folder_path, yaml_files.len());
    Ok(yaml_files)
}

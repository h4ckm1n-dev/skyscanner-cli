const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

/**
 * Module avec des utilitaires pour l'interface CLI
 */

/**
 * Crée un dossier s'il n'existe pas déjà
 * @param {string} dirPath - Chemin du dossier à créer
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Sauvegarde des données dans un fichier JSON
 * @param {Object} data - Les données à sauvegarder
 * @param {string} filePath - Chemin du fichier
 * @param {boolean} pretty - Formater avec indentation
 * @returns {boolean} Succès ou échec
 */
function saveToJsonFile(data, filePath, pretty = true) {
  try {
    const dirPath = path.dirname(filePath);
    ensureDirectoryExists(dirPath);
    
    const jsonData = pretty 
      ? JSON.stringify(data, null, 2) 
      : JSON.stringify(data);
    
    fs.writeFileSync(filePath, jsonData);
    return true;
  } catch (error) {
    console.error(chalk.red(`Erreur lors de la sauvegarde du fichier ${filePath}:`), error.message);
    return false;
  }
}

/**
 * Lit un fichier JSON et renvoie son contenu
 * @param {string} filePath - Chemin du fichier à lire
 * @returns {Object|null} Le contenu du fichier ou null en cas d'erreur
 */
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(chalk.red(`Erreur lors de la lecture du fichier ${filePath}:`), error.message);
    return null;
  }
}

/**
 * Génère un horodatage formaté pour les noms de fichiers
 * @returns {string} Horodatage formaté (YYYYMMDD_HHMMSS)
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Analyse une chaîne de date aux formats jj/mm/aaaa ou jj-mm-aaaa
 * @param {string} dateStr - Date au format jj/mm/aaaa ou jj-mm-aaaa
 * @returns {Date|null} Objet Date ou null si invalide
 */
function parseDate(dateStr) {
  try {
    let parts;
    
    // Accepter les deux formats: jj/mm/aaaa ou jj-mm-aaaa
    if (dateStr.includes('/')) {
      parts = dateStr.split('/');
    } else if (dateStr.includes('-')) {
      parts = dateStr.split('-');
    } else {
      return null;
    }
    
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Les mois commencent à 0
    const year = parseInt(parts[2], 10);
    
    // Vérifier que les valeurs sont dans des plages raisonnables
    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 2023 || year > 2100) {
      return null;
    }
    
    const date = new Date(year, month, day);
    
    // Vérifier que la date est valide
    if (isNaN(date.getTime())) return null;
    
    // Vérifier que le jour est correct (pour éviter des dates comme 31/02/2025)
    if (date.getDate() !== day) return null;
    
    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Formatte une date pour l'API (YYYY-MM-DD)
 * @param {Date} date - Date à formater
 * @returns {string} Date au format YYYY-MM-DD
 */
function formatDateForApi(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Vérifie si une date est dans le futur
 * @param {Date} date - Date à vérifier
 * @returns {boolean} Vrai si la date est dans le futur
 */
function isFutureDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

module.exports = {
  ensureDirectoryExists,
  saveToJsonFile,
  readJsonFile,
  getTimestamp,
  parseDate,
  formatDateForApi,
  isFutureDate
}; 
import fs from 'fs/promises';
import path from 'path';

/**
 * Retorna o diretório onde o usuário está executando o comando.
 */
export const getUserDir = () => process.cwd();

/**
 * Constrói o caminho completo para o arquivo de configuração no diretório do usuário.
 */
export const getConfigPath = (fileName = 'gen-commit.config.json') => {
  return path.join(getUserDir(), fileName);
};


export const _exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};


export const readJson = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
};


export const saveJson = async (filePath, data) => {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
};

/**
 * Garante que um diretório exista (cria se não existir, inclusive pastas pai).
 * @param {string} relativePath - Caminho da pasta (ex: 'gen-commit/exit')
 */
export const ensureDir = async (relativePath) => {
  const dirPath = path.join(getUserDir(), relativePath);
  
  if (!(await _exists(dirPath))) {
    // recursive: true permite criar 'gen-commit' e 'exit' de uma vez só
    await fs.mkdir(dirPath, { recursive: true });
  }
  
  return dirPath;
};

/**
 * Cria um arquivo .md dentro de um diretório específico, criando as pastas se necessário.
 * @param {string} relativePath - Onde salvar (ex: 'gen-commit/exit')
 * @param {string} fileName - Nome do arquivo (ex: 'resultado.md')
 * @param {string} content - Texto que será gravado
 */
export const saveMarkdown = async (relativePath, fileName, content) => {
  const targetDir = await ensureDir(relativePath);
  
  const filePath = path.join(targetDir, fileName);
  
  await fs.writeFile(filePath, content, 'utf-8');
  
  return filePath;
};


export const addToFile = async (fileName, entries) => {
  const filePath = path.join(getUserDir(), fileName);
  let content = '';

  if (await _exists(filePath)) {
    content = await fs.readFile(filePath, 'utf-8');
  }

  const lines = content.split('\n').map(line => line.trim());
  const newEntries = entries.filter(entry => !lines.includes(entry));

  if (newEntries.length === 0) return;

  const prefix = (content.length > 0 && !content.endsWith('\n')) ? '\n' : '';
  const addition = newEntries.join('\n') + '\n';

  await fs.appendFile(filePath, prefix + addition, 'utf-8');
  
  return newEntries;
};
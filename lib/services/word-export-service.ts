import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";

const execFileAsync = promisify(execFile);

export interface ActivityWordExportData {
  school_name?: string;
  name: string;
  activity_date: string;
  day_name?: string;
  activity_type?: string;
  activity_type_other?: string;
  target_group?: string;
  total_participants?: number;
  qatari_count?: number;
  non_qatari_count?: number;
  responsible_department?: string;
  external_entity?: string;
  external_honored?: boolean;
  parent_participation?: boolean;
  activation_method?: string;
  activation_method_other?: string;
  objectives?: string;
  execution_steps?: string;
  safety_measures?: string;
  student_satisfaction?: number;
  activity_quality?: number;
  recommendations?: string;
  photos?: Array<{ path: string; original_name?: string }>;
}

export async function generateActivityWordDocument(data: ActivityWordExportData): Promise<Buffer> {
  const rootDir = process.cwd();
  const templatePath = path.join(rootDir, "تقرير النشاط 2026-2027 (1).docx");
  const scriptPath = path.join(rootDir, "scripts", "generate_activity_word.py");

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template document not found at: ${templatePath}`);
  }

  // Write temporary JSON data file
  const tempId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tempJsonPath = path.join(os.tmpdir(), `${tempId}.json`);
  const tempOutputPath = path.join(os.tmpdir(), `${tempId}.docx`);

  try {
    fs.writeFileSync(tempJsonPath, JSON.stringify(data, null, 2), "utf-8");

    // Execute Python script
    await execFileAsync("python", [scriptPath, templatePath, tempOutputPath, tempJsonPath]);

    if (!fs.existsSync(tempOutputPath)) {
      throw new Error("Generated docx file was not created by the script.");
    }

    const fileBuffer = fs.readFileSync(tempOutputPath);
    return fileBuffer;
  } finally {
    // Clean up temp files
    try {
      if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    } catch {
      // Ignore cleanup error
    }
  }
}

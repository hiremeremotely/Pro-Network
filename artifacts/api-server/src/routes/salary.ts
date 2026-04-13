import { Router } from "express";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { db, jobsTable, applicationsTable, profilesTable, skillsTable } from "@workspace/db";

const router = Router();

// ── Salary data layer ─────────────────────────────────────────────────────────
// Source: 2024/2025 remote salary benchmarks by country, role category, level
// All figures in USD annual equivalent

type ExperienceLevel = "junior" | "mid" | "senior" | "lead";
type JobCategory =
  | "Engineering"
  | "Design"
  | "Product"
  | "Marketing"
  | "Sales"
  | "Operations"
  | "Finance"
  | "Data"
  | "Customer Support"
  | "HR";

interface SalaryRange {
  min: number;
  max: number;
  median: number;
  employerCostPct: number; // % on top of salary for employer (benefits, taxes, NI)
  currencyNote: string;
}

type SalaryMatrix = Record<string, Record<JobCategory, Record<ExperienceLevel, SalaryRange>>>;

const SALARY_DATA: SalaryMatrix = {
  "United States": {
    Engineering:      { junior: { min:75000, max:110000, median:92000,  employerCostPct:18, currencyNote:"USD" }, mid: { min:110000, max:155000, median:130000, employerCostPct:18, currencyNote:"USD" }, senior: { min:155000, max:220000, median:185000, employerCostPct:18, currencyNote:"USD" }, lead: { min:200000, max:280000, median:240000, employerCostPct:18, currencyNote:"USD" } },
    Design:           { junior: { min:60000, max:85000,  median:72000,  employerCostPct:18, currencyNote:"USD" }, mid: { min:85000,  max:120000, median:102000, employerCostPct:18, currencyNote:"USD" }, senior: { min:120000, max:170000, median:145000, employerCostPct:18, currencyNote:"USD" }, lead: { min:160000, max:220000, median:190000, employerCostPct:18, currencyNote:"USD" } },
    Product:          { junior: { min:70000, max:100000, median:85000,  employerCostPct:18, currencyNote:"USD" }, mid: { min:100000, max:145000, median:122000, employerCostPct:18, currencyNote:"USD" }, senior: { min:145000, max:210000, median:175000, employerCostPct:18, currencyNote:"USD" }, lead: { min:190000, max:270000, median:228000, employerCostPct:18, currencyNote:"USD" } },
    Marketing:        { junior: { min:50000, max:72000,  median:61000,  employerCostPct:18, currencyNote:"USD" }, mid: { min:72000,  max:105000, median:88000,  employerCostPct:18, currencyNote:"USD" }, senior: { min:105000, max:150000, median:127000, employerCostPct:18, currencyNote:"USD" }, lead: { min:140000, max:200000, median:168000, employerCostPct:18, currencyNote:"USD" } },
    Sales:            { junior: { min:50000, max:75000,  median:62000,  employerCostPct:18, currencyNote:"USD" }, mid: { min:75000,  max:115000, median:93000,  employerCostPct:18, currencyNote:"USD" }, senior: { min:115000, max:175000, median:143000, employerCostPct:18, currencyNote:"USD" }, lead: { min:160000, max:250000, median:200000, employerCostPct:18, currencyNote:"USD" } },
    Operations:       { junior: { min:50000, max:72000,  median:60000,  employerCostPct:18, currencyNote:"USD" }, mid: { min:72000,  max:105000, median:87000,  employerCostPct:18, currencyNote:"USD" }, senior: { min:105000, max:148000, median:125000, employerCostPct:18, currencyNote:"USD" }, lead: { min:140000, max:195000, median:164000, employerCostPct:18, currencyNote:"USD" } },
    Finance:          { junior: { min:58000, max:82000,  median:70000,  employerCostPct:18, currencyNote:"USD" }, mid: { min:82000,  max:120000, median:100000, employerCostPct:18, currencyNote:"USD" }, senior: { min:120000, max:168000, median:142000, employerCostPct:18, currencyNote:"USD" }, lead: { min:160000, max:230000, median:192000, employerCostPct:18, currencyNote:"USD" } },
    Data:             { junior: { min:72000, max:105000, median:88000,  employerCostPct:18, currencyNote:"USD" }, mid: { min:105000, max:150000, median:125000, employerCostPct:18, currencyNote:"USD" }, senior: { min:150000, max:210000, median:178000, employerCostPct:18, currencyNote:"USD" }, lead: { min:200000, max:275000, median:235000, employerCostPct:18, currencyNote:"USD" } },
    "Customer Support":{ junior: { min:38000, max:55000, median:46000,  employerCostPct:18, currencyNote:"USD" }, mid: { min:55000,  max:80000,  median:67000,  employerCostPct:18, currencyNote:"USD" }, senior: { min:80000,  max:115000, median:96000,  employerCostPct:18, currencyNote:"USD" }, lead: { min:110000, max:155000, median:130000, employerCostPct:18, currencyNote:"USD" } },
    HR:               { junior: { min:48000, max:68000,  median:58000,  employerCostPct:18, currencyNote:"USD" }, mid: { min:68000,  max:100000, median:83000,  employerCostPct:18, currencyNote:"USD" }, senior: { min:100000, max:145000, median:121000, employerCostPct:18, currencyNote:"USD" }, lead: { min:138000, max:195000, median:163000, employerCostPct:18, currencyNote:"USD" } },
  },
  "United Kingdom": {
    Engineering:      { junior: { min:38000, max:55000, median:46000, employerCostPct:22, currencyNote:"GBP" }, mid: { min:55000, max:80000,  median:67000, employerCostPct:22, currencyNote:"GBP" }, senior: { min:80000,  max:120000, median:99000,  employerCostPct:22, currencyNote:"GBP" }, lead: { min:115000, max:165000, median:138000, employerCostPct:22, currencyNote:"GBP" } },
    Design:           { junior: { min:28000, max:42000, median:35000, employerCostPct:22, currencyNote:"GBP" }, mid: { min:42000, max:62000,  median:52000, employerCostPct:22, currencyNote:"GBP" }, senior: { min:62000,  max:90000,  median:75000,  employerCostPct:22, currencyNote:"GBP" }, lead: { min:85000,  max:125000, median:103000, employerCostPct:22, currencyNote:"GBP" } },
    Product:          { junior: { min:35000, max:52000, median:43000, employerCostPct:22, currencyNote:"GBP" }, mid: { min:52000, max:76000,  median:63000, employerCostPct:22, currencyNote:"GBP" }, senior: { min:76000,  max:110000, median:92000,  employerCostPct:22, currencyNote:"GBP" }, lead: { min:105000, max:155000, median:128000, employerCostPct:22, currencyNote:"GBP" } },
    Marketing:        { junior: { min:25000, max:37000, median:31000, employerCostPct:22, currencyNote:"GBP" }, mid: { min:37000, max:55000,  median:45000, employerCostPct:22, currencyNote:"GBP" }, senior: { min:55000,  max:82000,  median:67000,  employerCostPct:22, currencyNote:"GBP" }, lead: { min:78000,  max:115000, median:95000,  employerCostPct:22, currencyNote:"GBP" } },
    Sales:            { junior: { min:25000, max:40000, median:32000, employerCostPct:22, currencyNote:"GBP" }, mid: { min:40000, max:62000,  median:50000, employerCostPct:22, currencyNote:"GBP" }, senior: { min:62000,  max:95000,  median:77000,  employerCostPct:22, currencyNote:"GBP" }, lead: { min:90000,  max:140000, median:113000, employerCostPct:22, currencyNote:"GBP" } },
    Operations:       { junior: { min:24000, max:36000, median:30000, employerCostPct:22, currencyNote:"GBP" }, mid: { min:36000, max:54000,  median:44000, employerCostPct:22, currencyNote:"GBP" }, senior: { min:54000,  max:80000,  median:66000,  employerCostPct:22, currencyNote:"GBP" }, lead: { min:75000,  max:112000, median:91000,  employerCostPct:22, currencyNote:"GBP" } },
    Finance:          { junior: { min:30000, max:46000, median:38000, employerCostPct:22, currencyNote:"GBP" }, mid: { min:46000, max:68000,  median:57000, employerCostPct:22, currencyNote:"GBP" }, senior: { min:68000,  max:100000, median:83000,  employerCostPct:22, currencyNote:"GBP" }, lead: { min:95000,  max:142000, median:116000, employerCostPct:22, currencyNote:"GBP" } },
    Data:             { junior: { min:35000, max:52000, median:43000, employerCostPct:22, currencyNote:"GBP" }, mid: { min:52000, max:76000,  median:63000, employerCostPct:22, currencyNote:"GBP" }, senior: { min:76000,  max:112000, median:93000,  employerCostPct:22, currencyNote:"GBP" }, lead: { min:108000, max:158000, median:131000, employerCostPct:22, currencyNote:"GBP" } },
    "Customer Support":{ junior: { min:20000, max:29000, median:24000, employerCostPct:22, currencyNote:"GBP" }, mid: { min:29000, max:43000,  median:35000, employerCostPct:22, currencyNote:"GBP" }, senior: { min:43000,  max:63000,  median:52000,  employerCostPct:22, currencyNote:"GBP" }, lead: { min:60000,  max:90000,  median:73000,  employerCostPct:22, currencyNote:"GBP" } },
    HR:               { junior: { min:25000, max:37000, median:31000, employerCostPct:22, currencyNote:"GBP" }, mid: { min:37000, max:55000,  median:46000, employerCostPct:22, currencyNote:"GBP" }, senior: { min:55000,  max:82000,  median:68000,  employerCostPct:22, currencyNote:"GBP" }, lead: { min:78000,  max:115000, median:95000,  employerCostPct:22, currencyNote:"GBP" } },
  },
  "Germany": {
    Engineering:      { junior: { min:48000, max:68000, median:57000, employerCostPct:21, currencyNote:"EUR" }, mid: { min:68000, max:95000,  median:80000, employerCostPct:21, currencyNote:"EUR" }, senior: { min:95000,  max:135000, median:113000, employerCostPct:21, currencyNote:"EUR" }, lead: { min:128000, max:180000, median:152000, employerCostPct:21, currencyNote:"EUR" } },
    Design:           { junior: { min:36000, max:52000, median:43000, employerCostPct:21, currencyNote:"EUR" }, mid: { min:52000, max:75000,  median:62000, employerCostPct:21, currencyNote:"EUR" }, senior: { min:75000,  max:108000, median:90000,  employerCostPct:21, currencyNote:"EUR" }, lead: { min:100000, max:145000, median:120000, employerCostPct:21, currencyNote:"EUR" } },
    Product:          { junior: { min:44000, max:63000, median:52000, employerCostPct:21, currencyNote:"EUR" }, mid: { min:63000, max:90000,  median:75000, employerCostPct:21, currencyNote:"EUR" }, senior: { min:90000,  max:130000, median:108000, employerCostPct:21, currencyNote:"EUR" }, lead: { min:122000, max:175000, median:146000, employerCostPct:21, currencyNote:"EUR" } },
    Marketing:        { junior: { min:32000, max:46000, median:38000, employerCostPct:21, currencyNote:"EUR" }, mid: { min:46000, max:67000,  median:55000, employerCostPct:21, currencyNote:"EUR" }, senior: { min:67000,  max:97000,  median:80000,  employerCostPct:21, currencyNote:"EUR" }, lead: { min:90000,  max:130000, median:108000, employerCostPct:21, currencyNote:"EUR" } },
    Sales:            { junior: { min:32000, max:50000, median:40000, employerCostPct:21, currencyNote:"EUR" }, mid: { min:50000, max:74000,  median:61000, employerCostPct:21, currencyNote:"EUR" }, senior: { min:74000,  max:110000, median:90000,  employerCostPct:21, currencyNote:"EUR" }, lead: { min:105000, max:158000, median:129000, employerCostPct:21, currencyNote:"EUR" } },
    Operations:       { junior: { min:30000, max:44000, median:36000, employerCostPct:21, currencyNote:"EUR" }, mid: { min:44000, max:65000,  median:53000, employerCostPct:21, currencyNote:"EUR" }, senior: { min:65000,  max:95000,  median:78000,  employerCostPct:21, currencyNote:"EUR" }, lead: { min:88000,  max:130000, median:107000, employerCostPct:21, currencyNote:"EUR" } },
    Finance:          { junior: { min:38000, max:55000, median:46000, employerCostPct:21, currencyNote:"EUR" }, mid: { min:55000, max:80000,  median:67000, employerCostPct:21, currencyNote:"EUR" }, senior: { min:80000,  max:118000, median:98000,  employerCostPct:21, currencyNote:"EUR" }, lead: { min:112000, max:162000, median:134000, employerCostPct:21, currencyNote:"EUR" } },
    Data:             { junior: { min:44000, max:63000, median:52000, employerCostPct:21, currencyNote:"EUR" }, mid: { min:63000, max:92000,  median:76000, employerCostPct:21, currencyNote:"EUR" }, senior: { min:92000,  max:132000, median:110000, employerCostPct:21, currencyNote:"EUR" }, lead: { min:125000, max:178000, median:149000, employerCostPct:21, currencyNote:"EUR" } },
    "Customer Support":{ junior: { min:25000, max:36000, median:30000, employerCostPct:21, currencyNote:"EUR" }, mid: { min:36000, max:53000,  median:43000, employerCostPct:21, currencyNote:"EUR" }, senior: { min:53000,  max:77000,  median:63000,  employerCostPct:21, currencyNote:"EUR" }, lead: { min:72000,  max:108000, median:88000,  employerCostPct:21, currencyNote:"EUR" } },
    HR:               { junior: { min:32000, max:46000, median:38000, employerCostPct:21, currencyNote:"EUR" }, mid: { min:46000, max:67000,  median:56000, employerCostPct:21, currencyNote:"EUR" }, senior: { min:67000,  max:97000,  median:80000,  employerCostPct:21, currencyNote:"EUR" }, lead: { min:90000,  max:132000, median:109000, employerCostPct:21, currencyNote:"EUR" } },
  },
  "Canada": {
    Engineering:      { junior: { min:65000, max:92000, median:78000, employerCostPct:14, currencyNote:"CAD" }, mid: { min:92000, max:132000, median:110000, employerCostPct:14, currencyNote:"CAD" }, senior: { min:132000, max:185000, median:157000, employerCostPct:14, currencyNote:"CAD" }, lead: { min:175000, max:245000, median:207000, employerCostPct:14, currencyNote:"CAD" } },
    Design:           { junior: { min:50000, max:72000, median:61000, employerCostPct:14, currencyNote:"CAD" }, mid: { min:72000, max:104000, median:87000, employerCostPct:14, currencyNote:"CAD" }, senior: { min:104000, max:148000, median:124000, employerCostPct:14, currencyNote:"CAD" }, lead: { min:138000, max:195000, median:165000, employerCostPct:14, currencyNote:"CAD" } },
    Product:          { junior: { min:60000, max:85000, median:72000, employerCostPct:14, currencyNote:"CAD" }, mid: { min:85000, max:122000, median:102000, employerCostPct:14, currencyNote:"CAD" }, senior: { min:122000, max:175000, median:147000, employerCostPct:14, currencyNote:"CAD" }, lead: { min:162000, max:230000, median:194000, employerCostPct:14, currencyNote:"CAD" } },
    Marketing:        { junior: { min:42000, max:60000, median:51000, employerCostPct:14, currencyNote:"CAD" }, mid: { min:60000, max:87000,  median:73000, employerCostPct:14, currencyNote:"CAD" }, senior: { min:87000,  max:126000, median:105000, employerCostPct:14, currencyNote:"CAD" }, lead: { min:118000, max:170000, median:142000, employerCostPct:14, currencyNote:"CAD" } },
    Sales:            { junior: { min:42000, max:62000, median:52000, employerCostPct:14, currencyNote:"CAD" }, mid: { min:62000, max:92000,  median:76000, employerCostPct:14, currencyNote:"CAD" }, senior: { min:92000,  max:138000, median:113000, employerCostPct:14, currencyNote:"CAD" }, lead: { min:130000, max:195000, median:160000, employerCostPct:14, currencyNote:"CAD" } },
    Operations:       { junior: { min:40000, max:58000, median:48000, employerCostPct:14, currencyNote:"CAD" }, mid: { min:58000, max:85000,  median:70000, employerCostPct:14, currencyNote:"CAD" }, senior: { min:85000,  max:124000, median:103000, employerCostPct:14, currencyNote:"CAD" }, lead: { min:115000, max:168000, median:139000, employerCostPct:14, currencyNote:"CAD" } },
    Finance:          { junior: { min:48000, max:68000, median:58000, employerCostPct:14, currencyNote:"CAD" }, mid: { min:68000, max:98000,  median:82000, employerCostPct:14, currencyNote:"CAD" }, senior: { min:98000,  max:142000, median:118000, employerCostPct:14, currencyNote:"CAD" }, lead: { min:132000, max:190000, median:158000, employerCostPct:14, currencyNote:"CAD" } },
    Data:             { junior: { min:62000, max:88000, median:74000, employerCostPct:14, currencyNote:"CAD" }, mid: { min:88000, max:127000, median:106000, employerCostPct:14, currencyNote:"CAD" }, senior: { min:127000, max:180000, median:152000, employerCostPct:14, currencyNote:"CAD" }, lead: { min:170000, max:240000, median:202000, employerCostPct:14, currencyNote:"CAD" } },
    "Customer Support":{ junior: { min:32000, max:46000, median:38000, employerCostPct:14, currencyNote:"CAD" }, mid: { min:46000, max:66000,  median:55000, employerCostPct:14, currencyNote:"CAD" }, senior: { min:66000,  max:96000,  median:79000,  employerCostPct:14, currencyNote:"CAD" }, lead: { min:90000,  max:132000, median:109000, employerCostPct:14, currencyNote:"CAD" } },
    HR:               { junior: { min:40000, max:57000, median:48000, employerCostPct:14, currencyNote:"CAD" }, mid: { min:57000, max:82000,  median:68000, employerCostPct:14, currencyNote:"CAD" }, senior: { min:82000,  max:118000, median:99000,  employerCostPct:14, currencyNote:"CAD" }, lead: { min:112000, max:162000, median:134000, employerCostPct:14, currencyNote:"CAD" } },
  },
  "Australia": {
    Engineering:      { junior: { min:70000, max:100000, median:84000, employerCostPct:15, currencyNote:"AUD" }, mid: { min:100000, max:145000, median:121000, employerCostPct:15, currencyNote:"AUD" }, senior: { min:145000, max:210000, median:175000, employerCostPct:15, currencyNote:"AUD" }, lead: { min:195000, max:280000, median:235000, employerCostPct:15, currencyNote:"AUD" } },
    Design:           { junior: { min:55000, max:78000, median:66000, employerCostPct:15, currencyNote:"AUD" }, mid: { min:78000, max:112000, median:94000, employerCostPct:15, currencyNote:"AUD" }, senior: { min:112000, max:160000, median:134000, employerCostPct:15, currencyNote:"AUD" }, lead: { min:148000, max:215000, median:178000, employerCostPct:15, currencyNote:"AUD" } },
    Product:          { junior: { min:65000, max:92000, median:77000, employerCostPct:15, currencyNote:"AUD" }, mid: { min:92000, max:132000, median:111000, employerCostPct:15, currencyNote:"AUD" }, senior: { min:132000, max:190000, median:159000, employerCostPct:15, currencyNote:"AUD" }, lead: { min:178000, max:256000, median:214000, employerCostPct:15, currencyNote:"AUD" } },
    Marketing:        { junior: { min:48000, max:68000, median:57000, employerCostPct:15, currencyNote:"AUD" }, mid: { min:68000, max:98000,  median:82000, employerCostPct:15, currencyNote:"AUD" }, senior: { min:98000,  max:142000, median:118000, employerCostPct:15, currencyNote:"AUD" }, lead: { min:132000, max:192000, median:160000, employerCostPct:15, currencyNote:"AUD" } },
    Sales:            { junior: { min:48000, max:70000, median:58000, employerCostPct:15, currencyNote:"AUD" }, mid: { min:70000, max:102000, median:85000, employerCostPct:15, currencyNote:"AUD" }, senior: { min:102000, max:152000, median:125000, employerCostPct:15, currencyNote:"AUD" }, lead: { min:142000, max:212000, median:174000, employerCostPct:15, currencyNote:"AUD" } },
    Operations:       { junior: { min:45000, max:65000, median:54000, employerCostPct:15, currencyNote:"AUD" }, mid: { min:65000, max:95000,  median:78000, employerCostPct:15, currencyNote:"AUD" }, senior: { min:95000,  max:138000, median:114000, employerCostPct:15, currencyNote:"AUD" }, lead: { min:128000, max:188000, median:155000, employerCostPct:15, currencyNote:"AUD" } },
    Finance:          { junior: { min:54000, max:77000, median:65000, employerCostPct:15, currencyNote:"AUD" }, mid: { min:77000, max:110000, median:92000, employerCostPct:15, currencyNote:"AUD" }, senior: { min:110000, max:158000, median:132000, employerCostPct:15, currencyNote:"AUD" }, lead: { min:148000, max:215000, median:178000, employerCostPct:15, currencyNote:"AUD" } },
    Data:             { junior: { min:68000, max:97000, median:81000, employerCostPct:15, currencyNote:"AUD" }, mid: { min:97000, max:140000, median:117000, employerCostPct:15, currencyNote:"AUD" }, senior: { min:140000, max:200000, median:168000, employerCostPct:15, currencyNote:"AUD" }, lead: { min:188000, max:268000, median:225000, employerCostPct:15, currencyNote:"AUD" } },
    "Customer Support":{ junior: { min:38000, max:54000, median:45000, employerCostPct:15, currencyNote:"AUD" }, mid: { min:54000, max:78000,  median:65000, employerCostPct:15, currencyNote:"AUD" }, senior: { min:78000,  max:112000, median:93000,  employerCostPct:15, currencyNote:"AUD" }, lead: { min:105000, max:152000, median:126000, employerCostPct:15, currencyNote:"AUD" } },
    HR:               { junior: { min:46000, max:65000, median:55000, employerCostPct:15, currencyNote:"AUD" }, mid: { min:65000, max:93000,  median:78000, employerCostPct:15, currencyNote:"AUD" }, senior: { min:93000,  max:135000, median:112000, employerCostPct:15, currencyNote:"AUD" }, lead: { min:128000, max:185000, median:154000, employerCostPct:15, currencyNote:"AUD" } },
  },
  "India": {
    Engineering:      { junior: { min:600000, max:1000000, median:800000, employerCostPct:12, currencyNote:"INR" }, mid: { min:1000000, max:2200000, median:1500000, employerCostPct:12, currencyNote:"INR" }, senior: { min:2200000, max:4500000, median:3200000, employerCostPct:12, currencyNote:"INR" }, lead: { min:4000000, max:7000000, median:5500000, employerCostPct:12, currencyNote:"INR" } },
    Design:           { junior: { min:400000, max:700000, median:550000, employerCostPct:12, currencyNote:"INR" }, mid: { min:700000, max:1400000, median:1000000, employerCostPct:12, currencyNote:"INR" }, senior: { min:1400000, max:2800000, median:2000000, employerCostPct:12, currencyNote:"INR" }, lead: { min:2500000, max:4500000, median:3400000, employerCostPct:12, currencyNote:"INR" } },
    Product:          { junior: { min:500000, max:900000, median:700000, employerCostPct:12, currencyNote:"INR" }, mid: { min:900000, max:1900000, median:1350000, employerCostPct:12, currencyNote:"INR" }, senior: { min:1900000, max:3800000, median:2700000, employerCostPct:12, currencyNote:"INR" }, lead: { min:3500000, max:6200000, median:4700000, employerCostPct:12, currencyNote:"INR" } },
    Marketing:        { junior: { min:300000, max:550000, median:420000, employerCostPct:12, currencyNote:"INR" }, mid: { min:550000, max:1100000, median:800000, employerCostPct:12, currencyNote:"INR" }, senior: { min:1100000, max:2200000, median:1600000, employerCostPct:12, currencyNote:"INR" }, lead: { min:2000000, max:3600000, median:2700000, employerCostPct:12, currencyNote:"INR" } },
    Sales:            { junior: { min:280000, max:520000, median:400000, employerCostPct:12, currencyNote:"INR" }, mid: { min:520000, max:1050000, median:750000, employerCostPct:12, currencyNote:"INR" }, senior: { min:1050000, max:2100000, median:1500000, employerCostPct:12, currencyNote:"INR" }, lead: { min:1900000, max:3500000, median:2600000, employerCostPct:12, currencyNote:"INR" } },
    Operations:       { junior: { min:280000, max:500000, median:380000, employerCostPct:12, currencyNote:"INR" }, mid: { min:500000, max:1000000, median:720000, employerCostPct:12, currencyNote:"INR" }, senior: { min:1000000, max:2000000, median:1440000, employerCostPct:12, currencyNote:"INR" }, lead: { min:1800000, max:3300000, median:2500000, employerCostPct:12, currencyNote:"INR" } },
    Finance:          { junior: { min:350000, max:620000, median:480000, employerCostPct:12, currencyNote:"INR" }, mid: { min:620000, max:1250000, median:900000, employerCostPct:12, currencyNote:"INR" }, senior: { min:1250000, max:2500000, median:1800000, employerCostPct:12, currencyNote:"INR" }, lead: { min:2300000, max:4200000, median:3100000, employerCostPct:12, currencyNote:"INR" } },
    Data:             { junior: { min:550000, max:950000, median:750000, employerCostPct:12, currencyNote:"INR" }, mid: { min:950000, max:2000000, median:1400000, employerCostPct:12, currencyNote:"INR" }, senior: { min:2000000, max:4200000, median:3000000, employerCostPct:12, currencyNote:"INR" }, lead: { min:3800000, max:6800000, median:5200000, employerCostPct:12, currencyNote:"INR" } },
    "Customer Support":{ junior: { min:220000, max:380000, median:290000, employerCostPct:12, currencyNote:"INR" }, mid: { min:380000, max:700000, median:530000, employerCostPct:12, currencyNote:"INR" }, senior: { min:700000, max:1350000, median:1000000, employerCostPct:12, currencyNote:"INR" }, lead: { min:1200000, max:2200000, median:1680000, employerCostPct:12, currencyNote:"INR" } },
    HR:               { junior: { min:280000, max:500000, median:380000, employerCostPct:12, currencyNote:"INR" }, mid: { min:500000, max:1000000, median:720000, employerCostPct:12, currencyNote:"INR" }, senior: { min:1000000, max:2000000, median:1450000, employerCostPct:12, currencyNote:"INR" }, lead: { min:1850000, max:3400000, median:2550000, employerCostPct:12, currencyNote:"INR" } },
  },
  "Brazil": {
    Engineering:      { junior: { min:48000, max:84000,  median:65000,  employerCostPct:30, currencyNote:"BRL" }, mid: { min:84000,  max:160000, median:118000, employerCostPct:30, currencyNote:"BRL" }, senior: { min:160000, max:280000, median:210000, employerCostPct:30, currencyNote:"BRL" }, lead: { min:260000, max:420000, median:335000, employerCostPct:30, currencyNote:"BRL" } },
    Design:           { junior: { min:36000, max:60000,  median:47000,  employerCostPct:30, currencyNote:"BRL" }, mid: { min:60000,  max:110000, median:82000,  employerCostPct:30, currencyNote:"BRL" }, senior: { min:110000, max:190000, median:145000, employerCostPct:30, currencyNote:"BRL" }, lead: { min:175000, max:290000, median:228000, employerCostPct:30, currencyNote:"BRL" } },
    Product:          { junior: { min:44000, max:76000,  median:58000,  employerCostPct:30, currencyNote:"BRL" }, mid: { min:76000,  max:145000, median:107000, employerCostPct:30, currencyNote:"BRL" }, senior: { min:145000, max:255000, median:192000, employerCostPct:30, currencyNote:"BRL" }, lead: { min:235000, max:380000, median:302000, employerCostPct:30, currencyNote:"BRL" } },
    Marketing:        { junior: { min:30000, max:52000,  median:40000,  employerCostPct:30, currencyNote:"BRL" }, mid: { min:52000,  max:95000,  median:71000,  employerCostPct:30, currencyNote:"BRL" }, senior: { min:95000,  max:165000, median:126000, employerCostPct:30, currencyNote:"BRL" }, lead: { min:152000, max:248000, median:196000, employerCostPct:30, currencyNote:"BRL" } },
    Sales:            { junior: { min:30000, max:54000,  median:41000,  employerCostPct:30, currencyNote:"BRL" }, mid: { min:54000,  max:100000, median:74000,  employerCostPct:30, currencyNote:"BRL" }, senior: { min:100000, max:175000, median:133000, employerCostPct:30, currencyNote:"BRL" }, lead: { min:160000, max:265000, median:208000, employerCostPct:30, currencyNote:"BRL" } },
    Operations:       { junior: { min:28000, max:50000,  median:38000,  employerCostPct:30, currencyNote:"BRL" }, mid: { min:50000,  max:92000,  median:68000,  employerCostPct:30, currencyNote:"BRL" }, senior: { min:92000,  max:162000, median:122000, employerCostPct:30, currencyNote:"BRL" }, lead: { min:148000, max:245000, median:192000, employerCostPct:30, currencyNote:"BRL" } },
    Finance:          { junior: { min:34000, max:60000,  median:46000,  employerCostPct:30, currencyNote:"BRL" }, mid: { min:60000,  max:110000, median:82000,  employerCostPct:30, currencyNote:"BRL" }, senior: { min:110000, max:190000, median:146000, employerCostPct:30, currencyNote:"BRL" }, lead: { min:175000, max:290000, median:228000, employerCostPct:30, currencyNote:"BRL" } },
    Data:             { junior: { min:44000, max:78000,  median:60000,  employerCostPct:30, currencyNote:"BRL" }, mid: { min:78000,  max:148000, median:110000, employerCostPct:30, currencyNote:"BRL" }, senior: { min:148000, max:260000, median:196000, employerCostPct:30, currencyNote:"BRL" }, lead: { min:240000, max:395000, median:313000, employerCostPct:30, currencyNote:"BRL" } },
    "Customer Support":{ junior: { min:22000, max:38000, median:29000,  employerCostPct:30, currencyNote:"BRL" }, mid: { min:38000,  max:68000,  median:51000,  employerCostPct:30, currencyNote:"BRL" }, senior: { min:68000,  max:118000, median:89000,  employerCostPct:30, currencyNote:"BRL" }, lead: { min:108000, max:178000, median:140000, employerCostPct:30, currencyNote:"BRL" } },
    HR:               { junior: { min:28000, max:50000,  median:38000,  employerCostPct:30, currencyNote:"BRL" }, mid: { min:50000,  max:92000,  median:68000,  employerCostPct:30, currencyNote:"BRL" }, senior: { min:92000,  max:162000, median:122000, employerCostPct:30, currencyNote:"BRL" }, lead: { min:148000, max:245000, median:192000, employerCostPct:30, currencyNote:"BRL" } },
  },
  "Netherlands": {
    Engineering:      { junior: { min:45000, max:65000, median:54000, employerCostPct:20, currencyNote:"EUR" }, mid: { min:65000, max:95000,  median:78000, employerCostPct:20, currencyNote:"EUR" }, senior: { min:95000, max:135000, median:113000, employerCostPct:20, currencyNote:"EUR" }, lead: { min:128000, max:182000, median:153000, employerCostPct:20, currencyNote:"EUR" } },
    Design:           { junior: { min:34000, max:50000, median:41000, employerCostPct:20, currencyNote:"EUR" }, mid: { min:50000, max:73000,  median:60000, employerCostPct:20, currencyNote:"EUR" }, senior: { min:73000,  max:106000, median:88000,  employerCostPct:20, currencyNote:"EUR" }, lead: { min:100000, max:145000, median:120000, employerCostPct:20, currencyNote:"EUR" } },
    Product:          { junior: { min:42000, max:60000, median:50000, employerCostPct:20, currencyNote:"EUR" }, mid: { min:60000, max:88000,  median:73000, employerCostPct:20, currencyNote:"EUR" }, senior: { min:88000,  max:128000, median:106000, employerCostPct:20, currencyNote:"EUR" }, lead: { min:120000, max:175000, median:145000, employerCostPct:20, currencyNote:"EUR" } },
    Marketing:        { junior: { min:30000, max:44000, median:36000, employerCostPct:20, currencyNote:"EUR" }, mid: { min:44000, max:65000,  median:53000, employerCostPct:20, currencyNote:"EUR" }, senior: { min:65000,  max:96000,  median:79000,  employerCostPct:20, currencyNote:"EUR" }, lead: { min:90000,  max:132000, median:109000, employerCostPct:20, currencyNote:"EUR" } },
    Sales:            { junior: { min:30000, max:48000, median:38000, employerCostPct:20, currencyNote:"EUR" }, mid: { min:48000, max:72000,  median:59000, employerCostPct:20, currencyNote:"EUR" }, senior: { min:72000,  max:108000, median:88000,  employerCostPct:20, currencyNote:"EUR" }, lead: { min:102000, max:155000, median:126000, employerCostPct:20, currencyNote:"EUR" } },
    Operations:       { junior: { min:28000, max:42000, median:34000, employerCostPct:20, currencyNote:"EUR" }, mid: { min:42000, max:63000,  median:51000, employerCostPct:20, currencyNote:"EUR" }, senior: { min:63000,  max:93000,  median:76000,  employerCostPct:20, currencyNote:"EUR" }, lead: { min:87000,  max:130000, median:106000, employerCostPct:20, currencyNote:"EUR" } },
    Finance:          { junior: { min:36000, max:53000, median:43000, employerCostPct:20, currencyNote:"EUR" }, mid: { min:53000, max:78000,  median:64000, employerCostPct:20, currencyNote:"EUR" }, senior: { min:78000,  max:115000, median:95000,  employerCostPct:20, currencyNote:"EUR" }, lead: { min:108000, max:160000, median:132000, employerCostPct:20, currencyNote:"EUR" } },
    Data:             { junior: { min:42000, max:61000, median:50000, employerCostPct:20, currencyNote:"EUR" }, mid: { min:61000, max:90000,  median:74000, employerCostPct:20, currencyNote:"EUR" }, senior: { min:90000,  max:130000, median:108000, employerCostPct:20, currencyNote:"EUR" }, lead: { min:123000, max:178000, median:148000, employerCostPct:20, currencyNote:"EUR" } },
    "Customer Support":{ junior: { min:24000, max:35000, median:28000, employerCostPct:20, currencyNote:"EUR" }, mid: { min:35000, max:52000,  median:42000, employerCostPct:20, currencyNote:"EUR" }, senior: { min:52000,  max:76000,  median:62000,  employerCostPct:20, currencyNote:"EUR" }, lead: { min:70000,  max:105000, median:86000,  employerCostPct:20, currencyNote:"EUR" } },
    HR:               { junior: { min:30000, max:44000, median:36000, employerCostPct:20, currencyNote:"EUR" }, mid: { min:44000, max:65000,  median:53000, employerCostPct:20, currencyNote:"EUR" }, senior: { min:65000,  max:96000,  median:79000,  employerCostPct:20, currencyNote:"EUR" }, lead: { min:90000,  max:133000, median:109000, employerCostPct:20, currencyNote:"EUR" } },
  },
  "Poland": {
    Engineering:      { junior: { min:60000, max:95000,  median:76000,  employerCostPct:20, currencyNote:"PLN" }, mid: { min:95000,  max:155000, median:122000, employerCostPct:20, currencyNote:"PLN" }, senior: { min:155000, max:240000, median:193000, employerCostPct:20, currencyNote:"PLN" }, lead: { min:225000, max:340000, median:278000, employerCostPct:20, currencyNote:"PLN" } },
    Design:           { junior: { min:45000, max:72000,  median:57000,  employerCostPct:20, currencyNote:"PLN" }, mid: { min:72000,  max:115000, median:90000,  employerCostPct:20, currencyNote:"PLN" }, senior: { min:115000, max:178000, median:143000, employerCostPct:20, currencyNote:"PLN" }, lead: { min:165000, max:256000, median:207000, employerCostPct:20, currencyNote:"PLN" } },
    Product:          { junior: { min:55000, max:88000,  median:70000,  employerCostPct:20, currencyNote:"PLN" }, mid: { min:88000,  max:143000, median:112000, employerCostPct:20, currencyNote:"PLN" }, senior: { min:143000, max:222000, median:178000, employerCostPct:20, currencyNote:"PLN" }, lead: { min:207000, max:320000, median:256000, employerCostPct:20, currencyNote:"PLN" } },
    Marketing:        { junior: { min:40000, max:64000,  median:51000,  employerCostPct:20, currencyNote:"PLN" }, mid: { min:64000,  max:103000, median:81000,  employerCostPct:20, currencyNote:"PLN" }, senior: { min:103000, max:162000, median:129000, employerCostPct:20, currencyNote:"PLN" }, lead: { min:150000, max:235000, median:188000, employerCostPct:20, currencyNote:"PLN" } },
    Sales:            { junior: { min:40000, max:65000,  median:51000,  employerCostPct:20, currencyNote:"PLN" }, mid: { min:65000,  max:107000, median:84000,  employerCostPct:20, currencyNote:"PLN" }, senior: { min:107000, max:170000, median:135000, employerCostPct:20, currencyNote:"PLN" }, lead: { min:157000, max:250000, median:198000, employerCostPct:20, currencyNote:"PLN" } },
    Operations:       { junior: { min:38000, max:60000,  median:48000,  employerCostPct:20, currencyNote:"PLN" }, mid: { min:60000,  max:98000,  median:77000,  employerCostPct:20, currencyNote:"PLN" }, senior: { min:98000,  max:158000, median:125000, employerCostPct:20, currencyNote:"PLN" }, lead: { min:145000, max:228000, median:182000, employerCostPct:20, currencyNote:"PLN" } },
    Finance:          { junior: { min:44000, max:71000,  median:56000,  employerCostPct:20, currencyNote:"PLN" }, mid: { min:71000,  max:115000, median:90000,  employerCostPct:20, currencyNote:"PLN" }, senior: { min:115000, max:185000, median:147000, employerCostPct:20, currencyNote:"PLN" }, lead: { min:172000, max:270000, median:214000, employerCostPct:20, currencyNote:"PLN" } },
    Data:             { junior: { min:58000, max:92000,  median:73000,  employerCostPct:20, currencyNote:"PLN" }, mid: { min:92000,  max:150000, median:118000, employerCostPct:20, currencyNote:"PLN" }, senior: { min:150000, max:235000, median:188000, employerCostPct:20, currencyNote:"PLN" }, lead: { min:220000, max:340000, median:274000, employerCostPct:20, currencyNote:"PLN" } },
    "Customer Support":{ junior: { min:30000, max:48000, median:38000,  employerCostPct:20, currencyNote:"PLN" }, mid: { min:48000,  max:76000,  median:60000,  employerCostPct:20, currencyNote:"PLN" }, senior: { min:76000,  max:120000, median:95000,  employerCostPct:20, currencyNote:"PLN" }, lead: { min:112000, max:175000, median:140000, employerCostPct:20, currencyNote:"PLN" } },
    HR:               { junior: { min:38000, max:60000,  median:48000,  employerCostPct:20, currencyNote:"PLN" }, mid: { min:60000,  max:98000,  median:77000,  employerCostPct:20, currencyNote:"PLN" }, senior: { min:98000,  max:158000, median:125000, employerCostPct:20, currencyNote:"PLN" }, lead: { min:145000, max:228000, median:182000, employerCostPct:20, currencyNote:"PLN" } },
  },
  "Portugal": {
    Engineering:      { junior: { min:24000, max:36000, median:30000, employerCostPct:24, currencyNote:"EUR" }, mid: { min:36000, max:55000, median:44000, employerCostPct:24, currencyNote:"EUR" }, senior: { min:55000, max:85000, median:68000, employerCostPct:24, currencyNote:"EUR" }, lead: { min:78000, max:120000, median:96000, employerCostPct:24, currencyNote:"EUR" } },
    Design:           { junior: { min:18000, max:27000, median:22000, employerCostPct:24, currencyNote:"EUR" }, mid: { min:27000, max:42000, median:33000, employerCostPct:24, currencyNote:"EUR" }, senior: { min:42000, max:65000, median:52000, employerCostPct:24, currencyNote:"EUR" }, lead: { min:60000, max:92000, median:74000, employerCostPct:24, currencyNote:"EUR" } },
    Product:          { junior: { min:22000, max:33000, median:27000, employerCostPct:24, currencyNote:"EUR" }, mid: { min:33000, max:50000, median:40000, employerCostPct:24, currencyNote:"EUR" }, senior: { min:50000, max:78000, median:62000, employerCostPct:24, currencyNote:"EUR" }, lead: { min:72000, max:112000, median:89000, employerCostPct:24, currencyNote:"EUR" } },
    Marketing:        { junior: { min:16000, max:24000, median:19000, employerCostPct:24, currencyNote:"EUR" }, mid: { min:24000, max:36000, median:29000, employerCostPct:24, currencyNote:"EUR" }, senior: { min:36000, max:56000, median:44000, employerCostPct:24, currencyNote:"EUR" }, lead: { min:52000, max:82000, median:65000, employerCostPct:24, currencyNote:"EUR" } },
    Sales:            { junior: { min:16000, max:25000, median:20000, employerCostPct:24, currencyNote:"EUR" }, mid: { min:25000, max:40000, median:31000, employerCostPct:24, currencyNote:"EUR" }, senior: { min:40000, max:62000, median:49000, employerCostPct:24, currencyNote:"EUR" }, lead: { min:57000, max:92000, median:73000, employerCostPct:24, currencyNote:"EUR" } },
    Operations:       { junior: { min:15000, max:23000, median:18000, employerCostPct:24, currencyNote:"EUR" }, mid: { min:23000, max:36000, median:28000, employerCostPct:24, currencyNote:"EUR" }, senior: { min:36000, max:56000, median:44000, employerCostPct:24, currencyNote:"EUR" }, lead: { min:52000, max:82000, median:65000, employerCostPct:24, currencyNote:"EUR" } },
    Finance:          { junior: { min:18000, max:27000, median:22000, employerCostPct:24, currencyNote:"EUR" }, mid: { min:27000, max:42000, median:33000, employerCostPct:24, currencyNote:"EUR" }, senior: { min:42000, max:65000, median:52000, employerCostPct:24, currencyNote:"EUR" }, lead: { min:60000, max:96000, median:76000, employerCostPct:24, currencyNote:"EUR" } },
    Data:             { junior: { min:22000, max:34000, median:27000, employerCostPct:24, currencyNote:"EUR" }, mid: { min:34000, max:53000, median:42000, employerCostPct:24, currencyNote:"EUR" }, senior: { min:53000, max:82000, median:66000, employerCostPct:24, currencyNote:"EUR" }, lead: { min:76000, max:118000, median:94000, employerCostPct:24, currencyNote:"EUR" } },
    "Customer Support":{ junior: { min:13000, max:19000, median:15000, employerCostPct:24, currencyNote:"EUR" }, mid: { min:19000, max:29000, median:23000, employerCostPct:24, currencyNote:"EUR" }, senior: { min:29000, max:45000, median:36000, employerCostPct:24, currencyNote:"EUR" }, lead: { min:42000, max:66000, median:52000, employerCostPct:24, currencyNote:"EUR" } },
    HR:               { junior: { min:16000, max:24000, median:19000, employerCostPct:24, currencyNote:"EUR" }, mid: { min:24000, max:36000, median:29000, employerCostPct:24, currencyNote:"EUR" }, senior: { min:36000, max:56000, median:44000, employerCostPct:24, currencyNote:"EUR" }, lead: { min:52000, max:82000, median:65000, employerCostPct:24, currencyNote:"EUR" } },
  },
  "Spain": {
    Engineering:      { junior: { min:26000, max:40000, median:32000, employerCostPct:30, currencyNote:"EUR" }, mid: { min:40000, max:62000, median:50000, employerCostPct:30, currencyNote:"EUR" }, senior: { min:62000, max:95000, median:76000, employerCostPct:30, currencyNote:"EUR" }, lead: { min:88000, max:135000, median:108000, employerCostPct:30, currencyNote:"EUR" } },
    Design:           { junior: { min:20000, max:31000, median:25000, employerCostPct:30, currencyNote:"EUR" }, mid: { min:31000, max:48000, median:38000, employerCostPct:30, currencyNote:"EUR" }, senior: { min:48000, max:74000, median:59000, employerCostPct:30, currencyNote:"EUR" }, lead: { min:68000, max:105000, median:84000, employerCostPct:30, currencyNote:"EUR" } },
    Product:          { junior: { min:24000, max:37000, median:29000, employerCostPct:30, currencyNote:"EUR" }, mid: { min:37000, max:57000, median:46000, employerCostPct:30, currencyNote:"EUR" }, senior: { min:57000, max:88000, median:70000, employerCostPct:30, currencyNote:"EUR" }, lead: { min:82000, max:126000, median:100000, employerCostPct:30, currencyNote:"EUR" } },
    Marketing:        { junior: { min:18000, max:27000, median:22000, employerCostPct:30, currencyNote:"EUR" }, mid: { min:27000, max:42000, median:33000, employerCostPct:30, currencyNote:"EUR" }, senior: { min:42000, max:65000, median:52000, employerCostPct:30, currencyNote:"EUR" }, lead: { min:60000, max:95000, median:75000, employerCostPct:30, currencyNote:"EUR" } },
    Sales:            { junior: { min:18000, max:28000, median:22000, employerCostPct:30, currencyNote:"EUR" }, mid: { min:28000, max:45000, median:35000, employerCostPct:30, currencyNote:"EUR" }, senior: { min:45000, max:70000, median:56000, employerCostPct:30, currencyNote:"EUR" }, lead: { min:65000, max:102000, median:81000, employerCostPct:30, currencyNote:"EUR" } },
    Operations:       { junior: { min:17000, max:26000, median:21000, employerCostPct:30, currencyNote:"EUR" }, mid: { min:26000, max:40000, median:32000, employerCostPct:30, currencyNote:"EUR" }, senior: { min:40000, max:62000, median:50000, employerCostPct:30, currencyNote:"EUR" }, lead: { min:58000, max:92000, median:73000, employerCostPct:30, currencyNote:"EUR" } },
    Finance:          { junior: { min:20000, max:31000, median:25000, employerCostPct:30, currencyNote:"EUR" }, mid: { min:31000, max:48000, median:38000, employerCostPct:30, currencyNote:"EUR" }, senior: { min:48000, max:74000, median:59000, employerCostPct:30, currencyNote:"EUR" }, lead: { min:68000, max:108000, median:86000, employerCostPct:30, currencyNote:"EUR" } },
    Data:             { junior: { min:24000, max:37000, median:30000, employerCostPct:30, currencyNote:"EUR" }, mid: { min:37000, max:58000, median:46000, employerCostPct:30, currencyNote:"EUR" }, senior: { min:58000, max:90000, median:72000, employerCostPct:30, currencyNote:"EUR" }, lead: { min:84000, max:130000, median:104000, employerCostPct:30, currencyNote:"EUR" } },
    "Customer Support":{ junior: { min:14000, max:21000, median:17000, employerCostPct:30, currencyNote:"EUR" }, mid: { min:21000, max:33000, median:26000, employerCostPct:30, currencyNote:"EUR" }, senior: { min:33000, max:51000, median:40000, employerCostPct:30, currencyNote:"EUR" }, lead: { min:47000, max:74000, median:59000, employerCostPct:30, currencyNote:"EUR" } },
    HR:               { junior: { min:18000, max:27000, median:22000, employerCostPct:30, currencyNote:"EUR" }, mid: { min:27000, max:42000, median:33000, employerCostPct:30, currencyNote:"EUR" }, senior: { min:42000, max:65000, median:52000, employerCostPct:30, currencyNote:"EUR" }, lead: { min:60000, max:95000, median:75000, employerCostPct:30, currencyNote:"EUR" } },
  },
  "France": {
    Engineering:      { junior: { min:38000, max:55000, median:46000, employerCostPct:42, currencyNote:"EUR" }, mid: { min:55000, max:82000, median:67000, employerCostPct:42, currencyNote:"EUR" }, senior: { min:82000, max:120000, median:99000, employerCostPct:42, currencyNote:"EUR" }, lead: { min:112000, max:165000, median:136000, employerCostPct:42, currencyNote:"EUR" } },
    Design:           { junior: { min:28000, max:42000, median:34000, employerCostPct:42, currencyNote:"EUR" }, mid: { min:42000, max:63000, median:51000, employerCostPct:42, currencyNote:"EUR" }, senior: { min:63000, max:93000, median:76000, employerCostPct:42, currencyNote:"EUR" }, lead: { min:87000, max:130000, median:106000, employerCostPct:42, currencyNote:"EUR" } },
    Product:          { junior: { min:34000, max:50000, median:41000, employerCostPct:42, currencyNote:"EUR" }, mid: { min:50000, max:75000, median:61000, employerCostPct:42, currencyNote:"EUR" }, senior: { min:75000, max:112000, median:91000, employerCostPct:42, currencyNote:"EUR" }, lead: { min:105000, max:158000, median:128000, employerCostPct:42, currencyNote:"EUR" } },
    Marketing:        { junior: { min:26000, max:38000, median:31000, employerCostPct:42, currencyNote:"EUR" }, mid: { min:38000, max:57000, median:46000, employerCostPct:42, currencyNote:"EUR" }, senior: { min:57000, max:85000, median:69000, employerCostPct:42, currencyNote:"EUR" }, lead: { min:80000, max:120000, median:97000, employerCostPct:42, currencyNote:"EUR" } },
    Sales:            { junior: { min:26000, max:40000, median:32000, employerCostPct:42, currencyNote:"EUR" }, mid: { min:40000, max:62000, median:50000, employerCostPct:42, currencyNote:"EUR" }, senior: { min:62000, max:94000, median:76000, employerCostPct:42, currencyNote:"EUR" }, lead: { min:88000, max:136000, median:110000, employerCostPct:42, currencyNote:"EUR" } },
    Operations:       { junior: { min:25000, max:37000, median:30000, employerCostPct:42, currencyNote:"EUR" }, mid: { min:37000, max:56000, median:45000, employerCostPct:42, currencyNote:"EUR" }, senior: { min:56000, max:84000, median:68000, employerCostPct:42, currencyNote:"EUR" }, lead: { min:78000, max:118000, median:96000, employerCostPct:42, currencyNote:"EUR" } },
    Finance:          { junior: { min:30000, max:44000, median:36000, employerCostPct:42, currencyNote:"EUR" }, mid: { min:44000, max:66000, median:53000, employerCostPct:42, currencyNote:"EUR" }, senior: { min:66000, max:99000, median:81000, employerCostPct:42, currencyNote:"EUR" }, lead: { min:92000, max:140000, median:114000, employerCostPct:42, currencyNote:"EUR" } },
    Data:             { junior: { min:36000, max:53000, median:43000, employerCostPct:42, currencyNote:"EUR" }, mid: { min:53000, max:80000, median:65000, employerCostPct:42, currencyNote:"EUR" }, senior: { min:80000, max:118000, median:97000, employerCostPct:42, currencyNote:"EUR" }, lead: { min:110000, max:162000, median:133000, employerCostPct:42, currencyNote:"EUR" } },
    "Customer Support":{ junior: { min:20000, max:30000, median:24000, employerCostPct:42, currencyNote:"EUR" }, mid: { min:30000, max:45000, median:36000, employerCostPct:42, currencyNote:"EUR" }, senior: { min:45000, max:68000, median:55000, employerCostPct:42, currencyNote:"EUR" }, lead: { min:63000, max:97000, median:78000, employerCostPct:42, currencyNote:"EUR" } },
    HR:               { junior: { min:26000, max:38000, median:31000, employerCostPct:42, currencyNote:"EUR" }, mid: { min:38000, max:57000, median:46000, employerCostPct:42, currencyNote:"EUR" }, senior: { min:57000, max:85000, median:69000, employerCostPct:42, currencyNote:"EUR" }, lead: { min:80000, max:120000, median:97000, employerCostPct:42, currencyNote:"EUR" } },
  },
  "Mexico": {
    Engineering:      { junior: { min:280000, max:480000, median:370000, employerCostPct:28, currencyNote:"MXN" }, mid: { min:480000, max:840000, median:640000, employerCostPct:28, currencyNote:"MXN" }, senior: { min:840000, max:1450000, median:1100000, employerCostPct:28, currencyNote:"MXN" }, lead: { min:1350000, max:2300000, median:1800000, employerCostPct:28, currencyNote:"MXN" } },
    Design:           { junior: { min:200000, max:340000, median:260000, employerCostPct:28, currencyNote:"MXN" }, mid: { min:340000, max:600000, median:455000, employerCostPct:28, currencyNote:"MXN" }, senior: { min:600000, max:1050000, median:795000, employerCostPct:28, currencyNote:"MXN" }, lead: { min:960000, max:1660000, median:1290000, employerCostPct:28, currencyNote:"MXN" } },
    Product:          { junior: { min:250000, max:430000, median:330000, employerCostPct:28, currencyNote:"MXN" }, mid: { min:430000, max:760000, median:575000, employerCostPct:28, currencyNote:"MXN" }, senior: { min:760000, max:1320000, median:1000000, employerCostPct:28, currencyNote:"MXN" }, lead: { min:1220000, max:2100000, median:1640000, employerCostPct:28, currencyNote:"MXN" } },
    Marketing:        { junior: { min:170000, max:295000, median:227000, employerCostPct:28, currencyNote:"MXN" }, mid: { min:295000, max:530000, median:400000, employerCostPct:28, currencyNote:"MXN" }, senior: { min:530000, max:930000, median:710000, employerCostPct:28, currencyNote:"MXN" }, lead: { min:860000, max:1490000, median:1160000, employerCostPct:28, currencyNote:"MXN" } },
    Sales:            { junior: { min:170000, max:300000, median:230000, employerCostPct:28, currencyNote:"MXN" }, mid: { min:300000, max:545000, median:410000, employerCostPct:28, currencyNote:"MXN" }, senior: { min:545000, max:970000, median:736000, employerCostPct:28, currencyNote:"MXN" }, lead: { min:900000, max:1570000, median:1220000, employerCostPct:28, currencyNote:"MXN" } },
    Operations:       { junior: { min:155000, max:270000, median:208000, employerCostPct:28, currencyNote:"MXN" }, mid: { min:270000, max:490000, median:370000, employerCostPct:28, currencyNote:"MXN" }, senior: { min:490000, max:870000, median:660000, employerCostPct:28, currencyNote:"MXN" }, lead: { min:803000, max:1400000, median:1090000, employerCostPct:28, currencyNote:"MXN" } },
    Finance:          { junior: { min:200000, max:350000, median:268000, employerCostPct:28, currencyNote:"MXN" }, mid: { min:350000, max:626000, median:473000, employerCostPct:28, currencyNote:"MXN" }, senior: { min:626000, max:1100000, median:834000, employerCostPct:28, currencyNote:"MXN" }, lead: { min:1016000, max:1770000, median:1377000, employerCostPct:28, currencyNote:"MXN" } },
    Data:             { junior: { min:260000, max:454000, median:348000, employerCostPct:28, currencyNote:"MXN" }, mid: { min:454000, max:800000, median:605000, employerCostPct:28, currencyNote:"MXN" }, senior: { min:800000, max:1400000, median:1063000, employerCostPct:28, currencyNote:"MXN" }, lead: { min:1300000, max:2260000, median:1755000, employerCostPct:28, currencyNote:"MXN" } },
    "Customer Support":{ junior: { min:130000, max:225000, median:172000, employerCostPct:28, currencyNote:"MXN" }, mid: { min:225000, max:405000, median:305000, employerCostPct:28, currencyNote:"MXN" }, senior: { min:405000, max:720000, median:545000, employerCostPct:28, currencyNote:"MXN" }, lead: { min:662000, max:1160000, median:898000, employerCostPct:28, currencyNote:"MXN" } },
    HR:               { junior: { min:155000, max:270000, median:207000, employerCostPct:28, currencyNote:"MXN" }, mid: { min:270000, max:490000, median:370000, employerCostPct:28, currencyNote:"MXN" }, senior: { min:490000, max:870000, median:660000, employerCostPct:28, currencyNote:"MXN" }, lead: { min:803000, max:1400000, median:1090000, employerCostPct:28, currencyNote:"MXN" } },
  },
  "Argentina": {
    Engineering:      { junior: { min:2000000, max:3500000, median:2700000, employerCostPct:28, currencyNote:"ARS" }, mid: { min:3500000, max:6500000, median:5000000, employerCostPct:28, currencyNote:"ARS" }, senior: { min:6500000, max:11000000, median:8500000, employerCostPct:28, currencyNote:"ARS" }, lead: { min:10000000, max:17000000, median:13500000, employerCostPct:28, currencyNote:"ARS" } },
    Design:           { junior: { min:1500000, max:2500000, median:2000000, employerCostPct:28, currencyNote:"ARS" }, mid: { min:2500000, max:4500000, median:3500000, employerCostPct:28, currencyNote:"ARS" }, senior: { min:4500000, max:7800000, median:6000000, employerCostPct:28, currencyNote:"ARS" }, lead: { min:7200000, max:12500000, median:9700000, employerCostPct:28, currencyNote:"ARS" } },
    Product:          { junior: { min:1800000, max:3100000, median:2400000, employerCostPct:28, currencyNote:"ARS" }, mid: { min:3100000, max:5700000, median:4400000, employerCostPct:28, currencyNote:"ARS" }, senior: { min:5700000, max:10000000, median:7700000, employerCostPct:28, currencyNote:"ARS" }, lead: { min:9200000, max:16000000, median:12500000, employerCostPct:28, currencyNote:"ARS" } },
    Marketing:        { junior: { min:1300000, max:2200000, median:1700000, employerCostPct:28, currencyNote:"ARS" }, mid: { min:2200000, max:4000000, median:3100000, employerCostPct:28, currencyNote:"ARS" }, senior: { min:4000000, max:7000000, median:5400000, employerCostPct:28, currencyNote:"ARS" }, lead: { min:6400000, max:11200000, median:8700000, employerCostPct:28, currencyNote:"ARS" } },
    Sales:            { junior: { min:1300000, max:2300000, median:1750000, employerCostPct:28, currencyNote:"ARS" }, mid: { min:2300000, max:4200000, median:3200000, employerCostPct:28, currencyNote:"ARS" }, senior: { min:4200000, max:7400000, median:5700000, employerCostPct:28, currencyNote:"ARS" }, lead: { min:6800000, max:12000000, median:9300000, employerCostPct:28, currencyNote:"ARS" } },
    Operations:       { junior: { min:1200000, max:2100000, median:1600000, employerCostPct:28, currencyNote:"ARS" }, mid: { min:2100000, max:3900000, median:2950000, employerCostPct:28, currencyNote:"ARS" }, senior: { min:3900000, max:6800000, median:5250000, employerCostPct:28, currencyNote:"ARS" }, lead: { min:6200000, max:10900000, median:8500000, employerCostPct:28, currencyNote:"ARS" } },
    Finance:          { junior: { min:1500000, max:2600000, median:2000000, employerCostPct:28, currencyNote:"ARS" }, mid: { min:2600000, max:4700000, median:3600000, employerCostPct:28, currencyNote:"ARS" }, senior: { min:4700000, max:8200000, median:6300000, employerCostPct:28, currencyNote:"ARS" }, lead: { min:7600000, max:13300000, median:10300000, employerCostPct:28, currencyNote:"ARS" } },
    Data:             { junior: { min:1900000, max:3300000, median:2550000, employerCostPct:28, currencyNote:"ARS" }, mid: { min:3300000, max:6100000, median:4700000, employerCostPct:28, currencyNote:"ARS" }, senior: { min:6100000, max:10700000, median:8200000, employerCostPct:28, currencyNote:"ARS" }, lead: { min:9800000, max:17200000, median:13300000, employerCostPct:28, currencyNote:"ARS" } },
    "Customer Support":{ junior: { min:950000, max:1650000, median:1270000, employerCostPct:28, currencyNote:"ARS" }, mid: { min:1650000, max:3000000, median:2300000, employerCostPct:28, currencyNote:"ARS" }, senior: { min:3000000, max:5300000, median:4050000, employerCostPct:28, currencyNote:"ARS" }, lead: { min:4900000, max:8600000, median:6650000, employerCostPct:28, currencyNote:"ARS" } },
    HR:               { junior: { min:1200000, max:2100000, median:1600000, employerCostPct:28, currencyNote:"ARS" }, mid: { min:2100000, max:3900000, median:2950000, employerCostPct:28, currencyNote:"ARS" }, senior: { min:3900000, max:6800000, median:5250000, employerCostPct:28, currencyNote:"ARS" }, lead: { min:6200000, max:10900000, median:8500000, employerCostPct:28, currencyNote:"ARS" } },
  },
  "Nigeria": {
    Engineering:      { junior: { min:3000000, max:5500000, median:4200000, employerCostPct:15, currencyNote:"NGN" }, mid: { min:5500000, max:10500000, median:7900000, employerCostPct:15, currencyNote:"NGN" }, senior: { min:10500000, max:19000000, median:14400000, employerCostPct:15, currencyNote:"NGN" }, lead: { min:17500000, max:30000000, median:23000000, employerCostPct:15, currencyNote:"NGN" } },
    Design:           { junior: { min:2000000, max:3600000, median:2800000, employerCostPct:15, currencyNote:"NGN" }, mid: { min:3600000, max:7000000, median:5200000, employerCostPct:15, currencyNote:"NGN" }, senior: { min:7000000, max:13000000, median:9800000, employerCostPct:15, currencyNote:"NGN" }, lead: { min:12000000, max:21000000, median:16000000, employerCostPct:15, currencyNote:"NGN" } },
    Product:          { junior: { min:2500000, max:4600000, median:3500000, employerCostPct:15, currencyNote:"NGN" }, mid: { min:4600000, max:9000000, median:6700000, employerCostPct:15, currencyNote:"NGN" }, senior: { min:9000000, max:17000000, median:12800000, employerCostPct:15, currencyNote:"NGN" }, lead: { min:15500000, max:27000000, median:20500000, employerCostPct:15, currencyNote:"NGN" } },
    Marketing:        { junior: { min:1500000, max:2800000, median:2100000, employerCostPct:15, currencyNote:"NGN" }, mid: { min:2800000, max:5500000, median:4100000, employerCostPct:15, currencyNote:"NGN" }, senior: { min:5500000, max:10500000, median:7900000, employerCostPct:15, currencyNote:"NGN" }, lead: { min:9600000, max:17000000, median:12800000, employerCostPct:15, currencyNote:"NGN" } },
    Sales:            { junior: { min:1500000, max:2900000, median:2150000, employerCostPct:15, currencyNote:"NGN" }, mid: { min:2900000, max:5800000, median:4250000, employerCostPct:15, currencyNote:"NGN" }, senior: { min:5800000, max:11000000, median:8200000, employerCostPct:15, currencyNote:"NGN" }, lead: { min:10000000, max:18000000, median:13600000, employerCostPct:15, currencyNote:"NGN" } },
    Operations:       { junior: { min:1400000, max:2600000, median:2000000, employerCostPct:15, currencyNote:"NGN" }, mid: { min:2600000, max:5100000, median:3800000, employerCostPct:15, currencyNote:"NGN" }, senior: { min:5100000, max:9700000, median:7300000, employerCostPct:15, currencyNote:"NGN" }, lead: { min:9000000, max:16000000, median:12100000, employerCostPct:15, currencyNote:"NGN" } },
    Finance:          { junior: { min:1800000, max:3300000, median:2500000, employerCostPct:15, currencyNote:"NGN" }, mid: { min:3300000, max:6400000, median:4800000, employerCostPct:15, currencyNote:"NGN" }, senior: { min:6400000, max:12200000, median:9200000, employerCostPct:15, currencyNote:"NGN" }, lead: { min:11200000, max:19800000, median:15000000, employerCostPct:15, currencyNote:"NGN" } },
    Data:             { junior: { min:2700000, max:5000000, median:3800000, employerCostPct:15, currencyNote:"NGN" }, mid: { min:5000000, max:9600000, median:7200000, employerCostPct:15, currencyNote:"NGN" }, senior: { min:9600000, max:18000000, median:13600000, employerCostPct:15, currencyNote:"NGN" }, lead: { min:16500000, max:29000000, median:22000000, employerCostPct:15, currencyNote:"NGN" } },
    "Customer Support":{ junior: { min:1100000, max:2000000, median:1500000, employerCostPct:15, currencyNote:"NGN" }, mid: { min:2000000, max:3800000, median:2850000, employerCostPct:15, currencyNote:"NGN" }, senior: { min:3800000, max:7200000, median:5400000, employerCostPct:15, currencyNote:"NGN" }, lead: { min:6600000, max:11700000, median:8900000, employerCostPct:15, currencyNote:"NGN" } },
    HR:               { junior: { min:1400000, max:2600000, median:2000000, employerCostPct:15, currencyNote:"NGN" }, mid: { min:2600000, max:5100000, median:3800000, employerCostPct:15, currencyNote:"NGN" }, senior: { min:5100000, max:9700000, median:7300000, employerCostPct:15, currencyNote:"NGN" }, lead: { min:9000000, max:16000000, median:12100000, employerCostPct:15, currencyNote:"NGN" } },
  },
  "Singapore": {
    Engineering:      { junior: { min:55000, max:80000, median:66000, employerCostPct:17, currencyNote:"SGD" }, mid: { min:80000, max:120000, median:98000, employerCostPct:17, currencyNote:"SGD" }, senior: { min:120000, max:175000, median:146000, employerCostPct:17, currencyNote:"SGD" }, lead: { min:165000, max:240000, median:200000, employerCostPct:17, currencyNote:"SGD" } },
    Design:           { junior: { min:40000, max:58000, median:48000, employerCostPct:17, currencyNote:"SGD" }, mid: { min:58000, max:88000, median:72000, employerCostPct:17, currencyNote:"SGD" }, senior: { min:88000, max:130000, median:108000, employerCostPct:17, currencyNote:"SGD" }, lead: { min:122000, max:180000, median:149000, employerCostPct:17, currencyNote:"SGD" } },
    Product:          { junior: { min:50000, max:72000, median:60000, employerCostPct:17, currencyNote:"SGD" }, mid: { min:72000, max:108000, median:88000, employerCostPct:17, currencyNote:"SGD" }, senior: { min:108000, max:160000, median:132000, employerCostPct:17, currencyNote:"SGD" }, lead: { min:150000, max:220000, median:183000, employerCostPct:17, currencyNote:"SGD" } },
    Marketing:        { junior: { min:36000, max:52000, median:43000, employerCostPct:17, currencyNote:"SGD" }, mid: { min:52000, max:78000, median:63000, employerCostPct:17, currencyNote:"SGD" }, senior: { min:78000, max:116000, median:95000, employerCostPct:17, currencyNote:"SGD" }, lead: { min:108000, max:162000, median:132000, employerCostPct:17, currencyNote:"SGD" } },
    Sales:            { junior: { min:36000, max:55000, median:44000, employerCostPct:17, currencyNote:"SGD" }, mid: { min:55000, max:84000, median:68000, employerCostPct:17, currencyNote:"SGD" }, senior: { min:84000, max:128000, median:104000, employerCostPct:17, currencyNote:"SGD" }, lead: { min:120000, max:182000, median:149000, employerCostPct:17, currencyNote:"SGD" } },
    Operations:       { junior: { min:33000, max:48000, median:40000, employerCostPct:17, currencyNote:"SGD" }, mid: { min:48000, max:72000, median:59000, employerCostPct:17, currencyNote:"SGD" }, senior: { min:72000, max:108000, median:88000, employerCostPct:17, currencyNote:"SGD" }, lead: { min:100000, max:152000, median:124000, employerCostPct:17, currencyNote:"SGD" } },
    Finance:          { junior: { min:40000, max:58000, median:48000, employerCostPct:17, currencyNote:"SGD" }, mid: { min:58000, max:88000, median:72000, employerCostPct:17, currencyNote:"SGD" }, senior: { min:88000, max:132000, median:108000, employerCostPct:17, currencyNote:"SGD" }, lead: { min:122000, max:185000, median:151000, employerCostPct:17, currencyNote:"SGD" } },
    Data:             { junior: { min:52000, max:76000, median:63000, employerCostPct:17, currencyNote:"SGD" }, mid: { min:76000, max:115000, median:94000, employerCostPct:17, currencyNote:"SGD" }, senior: { min:115000, max:170000, median:140000, employerCostPct:17, currencyNote:"SGD" }, lead: { min:158000, max:235000, median:193000, employerCostPct:17, currencyNote:"SGD" } },
    "Customer Support":{ junior: { min:27000, max:39000, median:32000, employerCostPct:17, currencyNote:"SGD" }, mid: { min:39000, max:58000, median:47000, employerCostPct:17, currencyNote:"SGD" }, senior: { min:58000, max:87000, median:71000, employerCostPct:17, currencyNote:"SGD" }, lead: { min:80000, max:122000, median:99000, employerCostPct:17, currencyNote:"SGD" } },
    HR:               { junior: { min:36000, max:52000, median:43000, employerCostPct:17, currencyNote:"SGD" }, mid: { min:52000, max:78000, median:63000, employerCostPct:17, currencyNote:"SGD" }, senior: { min:78000, max:116000, median:95000, employerCostPct:17, currencyNote:"SGD" }, lead: { min:108000, max:162000, median:132000, employerCostPct:17, currencyNote:"SGD" } },
  },
  "Philippines": {
    Engineering:      { junior: { min:400000, max:700000, median:535000, employerCostPct:12, currencyNote:"PHP" }, mid: { min:700000, max:1350000, median:1010000, employerCostPct:12, currencyNote:"PHP" }, senior: { min:1350000, max:2500000, median:1880000, employerCostPct:12, currencyNote:"PHP" }, lead: { min:2300000, max:4000000, median:3100000, employerCostPct:12, currencyNote:"PHP" } },
    Design:           { junior: { min:280000, max:480000, median:370000, employerCostPct:12, currencyNote:"PHP" }, mid: { min:480000, max:900000, median:680000, employerCostPct:12, currencyNote:"PHP" }, senior: { min:900000, max:1700000, median:1280000, employerCostPct:12, currencyNote:"PHP" }, lead: { min:1560000, max:2750000, median:2110000, employerCostPct:12, currencyNote:"PHP" } },
    Product:          { junior: { min:350000, max:610000, median:468000, employerCostPct:12, currencyNote:"PHP" }, mid: { min:610000, max:1160000, median:870000, employerCostPct:12, currencyNote:"PHP" }, senior: { min:1160000, max:2180000, median:1640000, employerCostPct:12, currencyNote:"PHP" }, lead: { min:2000000, max:3540000, median:2720000, employerCostPct:12, currencyNote:"PHP" } },
    Marketing:        { junior: { min:220000, max:380000, median:292000, employerCostPct:12, currencyNote:"PHP" }, mid: { min:380000, max:720000, median:541000, employerCostPct:12, currencyNote:"PHP" }, senior: { min:720000, max:1360000, median:1023000, employerCostPct:12, currencyNote:"PHP" }, lead: { min:1250000, max:2220000, median:1706000, employerCostPct:12, currencyNote:"PHP" } },
    Sales:            { junior: { min:220000, max:390000, median:297000, employerCostPct:12, currencyNote:"PHP" }, mid: { min:390000, max:745000, median:558000, employerCostPct:12, currencyNote:"PHP" }, senior: { min:745000, max:1415000, median:1063000, employerCostPct:12, currencyNote:"PHP" }, lead: { min:1300000, max:2320000, median:1779000, employerCostPct:12, currencyNote:"PHP" } },
    Operations:       { junior: { min:200000, max:350000, median:268000, employerCostPct:12, currencyNote:"PHP" }, mid: { min:350000, max:665000, median:500000, employerCostPct:12, currencyNote:"PHP" }, senior: { min:665000, max:1268000, median:953000, employerCostPct:12, currencyNote:"PHP" }, lead: { min:1165000, max:2075000, median:1593000, employerCostPct:12, currencyNote:"PHP" } },
    Finance:          { junior: { min:250000, max:435000, median:334000, employerCostPct:12, currencyNote:"PHP" }, mid: { min:435000, max:830000, median:623000, employerCostPct:12, currencyNote:"PHP" }, senior: { min:830000, max:1580000, median:1188000, employerCostPct:12, currencyNote:"PHP" }, lead: { min:1455000, max:2590000, median:1988000, employerCostPct:12, currencyNote:"PHP" } },
    Data:             { junior: { min:380000, max:665000, median:510000, employerCostPct:12, currencyNote:"PHP" }, mid: { min:665000, max:1265000, median:950000, employerCostPct:12, currencyNote:"PHP" }, senior: { min:1265000, max:2400000, median:1805000, employerCostPct:12, currencyNote:"PHP" }, lead: { min:2200000, max:3920000, median:3009000, employerCostPct:12, currencyNote:"PHP" } },
    "Customer Support":{ junior: { min:170000, max:295000, median:226000, employerCostPct:12, currencyNote:"PHP" }, mid: { min:295000, max:560000, median:421000, employerCostPct:12, currencyNote:"PHP" }, senior: { min:560000, max:1067000, median:803000, employerCostPct:12, currencyNote:"PHP" }, lead: { min:980000, max:1745000, median:1340000, employerCostPct:12, currencyNote:"PHP" } },
    HR:               { junior: { min:200000, max:350000, median:268000, employerCostPct:12, currencyNote:"PHP" }, mid: { min:350000, max:665000, median:500000, employerCostPct:12, currencyNote:"PHP" }, senior: { min:665000, max:1268000, median:953000, employerCostPct:12, currencyNote:"PHP" }, lead: { min:1165000, max:2075000, median:1593000, employerCostPct:12, currencyNote:"PHP" } },
  },
  "Kenya": {
    Engineering:      { junior: { min:1200000, max:2100000, median:1600000, employerCostPct:15, currencyNote:"KES" }, mid: { min:2100000, max:4000000, median:3000000, employerCostPct:15, currencyNote:"KES" }, senior: { min:4000000, max:7500000, median:5600000, employerCostPct:15, currencyNote:"KES" }, lead: { min:7000000, max:12000000, median:9200000, employerCostPct:15, currencyNote:"KES" } },
    Design:           { junior: { min:840000, max:1460000, median:1120000, employerCostPct:15, currencyNote:"KES" }, mid: { min:1460000, max:2800000, median:2100000, employerCostPct:15, currencyNote:"KES" }, senior: { min:2800000, max:5250000, median:3930000, employerCostPct:15, currencyNote:"KES" }, lead: { min:4850000, max:8400000, median:6440000, employerCostPct:15, currencyNote:"KES" } },
    Product:          { junior: { min:1050000, max:1820000, median:1395000, employerCostPct:15, currencyNote:"KES" }, mid: { min:1820000, max:3500000, median:2610000, employerCostPct:15, currencyNote:"KES" }, senior: { min:3500000, max:6600000, median:4930000, employerCostPct:15, currencyNote:"KES" }, lead: { min:6100000, max:10600000, median:8120000, employerCostPct:15, currencyNote:"KES" } },
    Marketing:        { junior: { min:680000, max:1180000, median:905000, employerCostPct:15, currencyNote:"KES" }, mid: { min:1180000, max:2260000, median:1690000, employerCostPct:15, currencyNote:"KES" }, senior: { min:2260000, max:4280000, median:3200000, employerCostPct:15, currencyNote:"KES" }, lead: { min:3940000, max:6850000, median:5260000, employerCostPct:15, currencyNote:"KES" } },
    Sales:            { junior: { min:680000, max:1200000, median:920000, employerCostPct:15, currencyNote:"KES" }, mid: { min:1200000, max:2330000, median:1740000, employerCostPct:15, currencyNote:"KES" }, senior: { min:2330000, max:4450000, median:3320000, employerCostPct:15, currencyNote:"KES" }, lead: { min:4100000, max:7170000, median:5500000, employerCostPct:15, currencyNote:"KES" } },
    Operations:       { junior: { min:620000, max:1080000, median:830000, employerCostPct:15, currencyNote:"KES" }, mid: { min:1080000, max:2075000, median:1550000, employerCostPct:15, currencyNote:"KES" }, senior: { min:2075000, max:3950000, median:2950000, employerCostPct:15, currencyNote:"KES" }, lead: { min:3640000, max:6340000, median:4870000, employerCostPct:15, currencyNote:"KES" } },
    Finance:          { junior: { min:780000, max:1360000, median:1044000, employerCostPct:15, currencyNote:"KES" }, mid: { min:1360000, max:2600000, median:1944000, employerCostPct:15, currencyNote:"KES" }, senior: { min:2600000, max:4940000, median:3690000, employerCostPct:15, currencyNote:"KES" }, lead: { min:4550000, max:7930000, median:6090000, employerCostPct:15, currencyNote:"KES" } },
    Data:             { junior: { min:1100000, max:1920000, median:1474000, employerCostPct:15, currencyNote:"KES" }, mid: { min:1920000, max:3670000, median:2740000, employerCostPct:15, currencyNote:"KES" }, senior: { min:3670000, max:6990000, median:5220000, employerCostPct:15, currencyNote:"KES" }, lead: { min:6430000, max:11200000, median:8600000, employerCostPct:15, currencyNote:"KES" } },
    "Customer Support":{ junior: { min:500000, max:872000, median:670000, employerCostPct:15, currencyNote:"KES" }, mid: { min:872000, max:1665000, median:1245000, employerCostPct:15, currencyNote:"KES" }, senior: { min:1665000, max:3170000, median:2370000, employerCostPct:15, currencyNote:"KES" }, lead: { min:2920000, max:5090000, median:3910000, employerCostPct:15, currencyNote:"KES" } },
    HR:               { junior: { min:620000, max:1080000, median:830000, employerCostPct:15, currencyNote:"KES" }, mid: { min:1080000, max:2075000, median:1550000, employerCostPct:15, currencyNote:"KES" }, senior: { min:2075000, max:3950000, median:2950000, employerCostPct:15, currencyNote:"KES" }, lead: { min:3640000, max:6340000, median:4870000, employerCostPct:15, currencyNote:"KES" } },
  },
  "South Africa": {
    Engineering:      { junior: { min:350000, max:580000, median:455000, employerCostPct:18, currencyNote:"ZAR" }, mid: { min:580000, max:1050000, median:790000, employerCostPct:18, currencyNote:"ZAR" }, senior: { min:1050000, max:1900000, median:1430000, employerCostPct:18, currencyNote:"ZAR" }, lead: { min:1750000, max:3000000, median:2310000, employerCostPct:18, currencyNote:"ZAR" } },
    Design:           { junior: { min:240000, max:400000, median:308000, employerCostPct:18, currencyNote:"ZAR" }, mid: { min:400000, max:725000, median:543000, employerCostPct:18, currencyNote:"ZAR" }, senior: { min:725000, max:1320000, median:990000, employerCostPct:18, currencyNote:"ZAR" }, lead: { min:1215000, max:2100000, median:1610000, employerCostPct:18, currencyNote:"ZAR" } },
    Product:          { junior: { min:310000, max:515000, median:395000, employerCostPct:18, currencyNote:"ZAR" }, mid: { min:515000, max:935000, median:700000, employerCostPct:18, currencyNote:"ZAR" }, senior: { min:935000, max:1700000, median:1270000, employerCostPct:18, currencyNote:"ZAR" }, lead: { min:1560000, max:2700000, median:2072000, employerCostPct:18, currencyNote:"ZAR" } },
    Marketing:        { junior: { min:215000, max:357000, median:274000, employerCostPct:18, currencyNote:"ZAR" }, mid: { min:357000, max:648000, median:485000, employerCostPct:18, currencyNote:"ZAR" }, senior: { min:648000, max:1178000, median:881000, employerCostPct:18, currencyNote:"ZAR" }, lead: { min:1085000, max:1880000, median:1443000, employerCostPct:18, currencyNote:"ZAR" } },
    Sales:            { junior: { min:215000, max:360000, median:277000, employerCostPct:18, currencyNote:"ZAR" }, mid: { min:360000, max:660000, median:493000, employerCostPct:18, currencyNote:"ZAR" }, senior: { min:660000, max:1208000, median:903000, employerCostPct:18, currencyNote:"ZAR" }, lead: { min:1113000, max:1935000, median:1485000, employerCostPct:18, currencyNote:"ZAR" } },
    Operations:       { junior: { min:198000, max:330000, median:253000, employerCostPct:18, currencyNote:"ZAR" }, mid: { min:330000, max:600000, median:449000, employerCostPct:18, currencyNote:"ZAR" }, senior: { min:600000, max:1093000, median:817000, employerCostPct:18, currencyNote:"ZAR" }, lead: { min:1007000, max:1750000, median:1343000, employerCostPct:18, currencyNote:"ZAR" } },
    Finance:          { junior: { min:245000, max:408000, median:313000, employerCostPct:18, currencyNote:"ZAR" }, mid: { min:408000, max:742000, median:555000, employerCostPct:18, currencyNote:"ZAR" }, senior: { min:742000, max:1350000, median:1009000, employerCostPct:18, currencyNote:"ZAR" }, lead: { min:1243000, max:2160000, median:1659000, employerCostPct:18, currencyNote:"ZAR" } },
    Data:             { junior: { min:330000, max:550000, median:422000, employerCostPct:18, currencyNote:"ZAR" }, mid: { min:550000, max:1000000, median:748000, employerCostPct:18, currencyNote:"ZAR" }, senior: { min:1000000, max:1820000, median:1360000, employerCostPct:18, currencyNote:"ZAR" }, lead: { min:1675000, max:2910000, median:2233000, employerCostPct:18, currencyNote:"ZAR" } },
    "Customer Support":{ junior: { min:160000, max:267000, median:205000, employerCostPct:18, currencyNote:"ZAR" }, mid: { min:267000, max:485000, median:362000, employerCostPct:18, currencyNote:"ZAR" }, senior: { min:485000, max:883000, median:660000, employerCostPct:18, currencyNote:"ZAR" }, lead: { min:812000, max:1413000, median:1085000, employerCostPct:18, currencyNote:"ZAR" } },
    HR:               { junior: { min:198000, max:330000, median:253000, employerCostPct:18, currencyNote:"ZAR" }, mid: { min:330000, max:600000, median:449000, employerCostPct:18, currencyNote:"ZAR" }, senior: { min:600000, max:1093000, median:817000, employerCostPct:18, currencyNote:"ZAR" }, lead: { min:1007000, max:1750000, median:1343000, employerCostPct:18, currencyNote:"ZAR" } },
  },
  "Ukraine": {
    Engineering:      { junior: { min:350000, max:600000, median:466000, employerCostPct:22, currencyNote:"UAH" }, mid: { min:600000, max:1150000, median:860000, employerCostPct:22, currencyNote:"UAH" }, senior: { min:1150000, max:2100000, median:1570000, employerCostPct:22, currencyNote:"UAH" }, lead: { min:1930000, max:3340000, median:2560000, employerCostPct:22, currencyNote:"UAH" } },
    Design:           { junior: { min:240000, max:410000, median:315000, employerCostPct:22, currencyNote:"UAH" }, mid: { min:410000, max:790000, median:590000, employerCostPct:22, currencyNote:"UAH" }, senior: { min:790000, max:1450000, median:1083000, employerCostPct:22, currencyNote:"UAH" }, lead: { min:1330000, max:2310000, median:1773000, employerCostPct:22, currencyNote:"UAH" } },
    Product:          { junior: { min:310000, max:530000, median:407000, employerCostPct:22, currencyNote:"UAH" }, mid: { min:530000, max:1020000, median:762000, employerCostPct:22, currencyNote:"UAH" }, senior: { min:1020000, max:1880000, median:1404000, employerCostPct:22, currencyNote:"UAH" }, lead: { min:1728000, max:3000000, median:2302000, employerCostPct:22, currencyNote:"UAH" } },
    Marketing:        { junior: { min:215000, max:370000, median:284000, employerCostPct:22, currencyNote:"UAH" }, mid: { min:370000, max:715000, median:534000, employerCostPct:22, currencyNote:"UAH" }, senior: { min:715000, max:1316000, median:983000, employerCostPct:22, currencyNote:"UAH" }, lead: { min:1210000, max:2105000, median:1616000, employerCostPct:22, currencyNote:"UAH" } },
    Sales:            { junior: { min:215000, max:373000, median:286000, employerCostPct:22, currencyNote:"UAH" }, mid: { min:373000, max:721000, median:539000, employerCostPct:22, currencyNote:"UAH" }, senior: { min:721000, max:1330000, median:994000, employerCostPct:22, currencyNote:"UAH" }, lead: { min:1225000, max:2133000, median:1637000, employerCostPct:22, currencyNote:"UAH" } },
    Operations:       { junior: { min:198000, max:342000, median:262000, employerCostPct:22, currencyNote:"UAH" }, mid: { min:342000, max:660000, median:493000, employerCostPct:22, currencyNote:"UAH" }, senior: { min:660000, max:1215000, median:908000, employerCostPct:22, currencyNote:"UAH" }, lead: { min:1116000, max:1942000, median:1491000, employerCostPct:22, currencyNote:"UAH" } },
    Finance:          { junior: { min:245000, max:423000, median:325000, employerCostPct:22, currencyNote:"UAH" }, mid: { min:423000, max:816000, median:610000, employerCostPct:22, currencyNote:"UAH" }, senior: { min:816000, max:1503000, median:1123000, employerCostPct:22, currencyNote:"UAH" }, lead: { min:1383000, max:2406000, median:1847000, employerCostPct:22, currencyNote:"UAH" } },
    Data:             { junior: { min:330000, max:570000, median:437000, employerCostPct:22, currencyNote:"UAH" }, mid: { min:570000, max:1098000, median:820000, employerCostPct:22, currencyNote:"UAH" }, senior: { min:1098000, max:2022000, median:1511000, employerCostPct:22, currencyNote:"UAH" }, lead: { min:1860000, max:3235000, median:2483000, employerCostPct:22, currencyNote:"UAH" } },
    "Customer Support":{ junior: { min:160000, max:277000, median:212000, employerCostPct:22, currencyNote:"UAH" }, mid: { min:277000, max:534000, median:399000, employerCostPct:22, currencyNote:"UAH" }, senior: { min:534000, max:984000, median:735000, employerCostPct:22, currencyNote:"UAH" }, lead: { min:904000, max:1573000, median:1208000, employerCostPct:22, currencyNote:"UAH" } },
    HR:               { junior: { min:198000, max:342000, median:262000, employerCostPct:22, currencyNote:"UAH" }, mid: { min:342000, max:660000, median:493000, employerCostPct:22, currencyNote:"UAH" }, senior: { min:660000, max:1215000, median:908000, employerCostPct:22, currencyNote:"UAH" }, lead: { min:1116000, max:1942000, median:1491000, employerCostPct:22, currencyNote:"UAH" } },
  },
};

export const SUPPORTED_COUNTRIES = Object.keys(SALARY_DATA);
export const SUPPORTED_CATEGORIES: JobCategory[] = [
  "Engineering", "Design", "Product", "Marketing", "Sales",
  "Operations", "Finance", "Data", "Customer Support", "HR",
];
export const SUPPORTED_LEVELS: ExperienceLevel[] = ["junior", "mid", "senior", "lead"];

// ── GET /salary-estimate ──────────────────────────────────────────────────────
router.get("/salary-estimate", (req, res): void => {
  const { country, category, level } = req.query as Record<string, string>;

  if (!country || !category || !level) {
    res.status(400).json({ error: "country, category, and level are required" });
    return;
  }

  const countryData = SALARY_DATA[country];
  if (!countryData) {
    res.status(404).json({ error: `No salary data for country: ${country}` });
    return;
  }

  const categoryData = countryData[category as JobCategory];
  if (!categoryData) {
    res.status(404).json({ error: `No salary data for category: ${category}` });
    return;
  }

  const levelData = categoryData[level as ExperienceLevel];
  if (!levelData) {
    res.status(404).json({ error: `No salary data for level: ${level}` });
    return;
  }

  const employerCost = Math.round(levelData.median * (levelData.employerCostPct / 100));

  res.json({
    country,
    category,
    level,
    currency: levelData.currencyNote,
    min: levelData.min,
    max: levelData.max,
    median: levelData.median,
    employerCostPct: levelData.employerCostPct,
    estimatedEmployerCost: employerCost,
    totalCostToCompany: levelData.median + employerCost,
  });
});

// ── GET /hr-insights ──────────────────────────────────────────────────────────
// Returns: top job category, market salary range, top candidate matches, hiring trend
router.get("/hr-insights", async (req, res): Promise<void> => {
  const companyProfileId = parseInt(req.query.companyProfileId as string);
  if (!companyProfileId || isNaN(companyProfileId)) {
    res.status(400).json({ error: "companyProfileId is required" });
    return;
  }

  // 1. Find company's most active job category
  const companyJobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.companyProfileId, companyProfileId))
    .orderBy(desc(jobsTable.createdAt));

  const categoryCount: Record<string, number> = {};
  for (const job of companyJobs) {
    if (job.category) {
      categoryCount[job.category] = (categoryCount[job.category] ?? 0) + 1;
    }
  }
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // 2. Market salary range for top category (US as baseline for comparison)
  let marketSalary: { min: number; max: number; median: number; currency: string } | null = null;
  if (topCategory && SALARY_DATA["United States"][topCategory as JobCategory]) {
    const midRange = SALARY_DATA["United States"][topCategory as JobCategory]["mid"];
    marketSalary = {
      min: midRange.min,
      max: midRange.max,
      median: midRange.median,
      currency: "USD",
    };
  }

  // 3. Top matching candidates (profiles with matching industry/skills to company's jobs)
  const jobIds = companyJobs.map(j => j.id);
  let topCandidates: Array<{ id: number; name: string; headline: string; avatarUrl: string | null; location: string | null; skills: string[] }> = [];

  // Get job tags/category for matching
  const jobTags = [...new Set(companyJobs.flatMap(j => j.tags ?? []))];
  const jobCategories = [...new Set(companyJobs.map(j => j.category).filter(Boolean))];

  // Find profiles with matching skills
  let matchingProfileIds: number[] = [];

  if (jobIds.length > 0) {
    // Get applicants to company jobs (existing interest signals)
    const applicants = await db
      .select({ profileId: applicationsTable.profileId })
      .from(applicationsTable)
      .where(inArray(applicationsTable.jobId, jobIds))
      .limit(50);

    matchingProfileIds = [...new Set(applicants.map(a => a.profileId))];
  }

  // Also find profiles with matching skills via skills table
  if (jobTags.length > 0) {
    const skillMatches = await db
      .select({ profileId: skillsTable.profileId })
      .from(skillsTable)
      .where(
        sql`lower(${skillsTable.name}) = ANY(${sql`ARRAY[${sql.join(jobTags.map(t => sql`lower(${t})`), sql`, `)}]`})`
      )
      .limit(30);
    const skillMatchIds = skillMatches.map(s => s.profileId);
    matchingProfileIds = [...new Set([...matchingProfileIds, ...skillMatchIds])];
  }

  // Fetch top 3 individual profiles (not company accounts)
  if (matchingProfileIds.length > 0) {
    const profiles = await db
      .select()
      .from(profilesTable)
      .where(
        sql`${profilesTable.id} = ANY(${sql`ARRAY[${sql.join(matchingProfileIds.slice(0, 20).map(id => sql`${id}`), sql`, `)}]::int[]`}) AND ${profilesTable.accountType} = 'individual'`
      )
      .limit(3);

    const profileSkills = await Promise.all(
      profiles.map(p => db.select().from(skillsTable).where(eq(skillsTable.profileId, p.id)).limit(5))
    );

    topCandidates = profiles.map((p, i) => ({
      id: p.id,
      name: p.name,
      headline: p.headline ?? "",
      avatarUrl: p.avatarUrl ?? null,
      location: p.location ?? null,
      skills: (profileSkills[i] ?? []).map(s => s.name),
    }));
  }

  // 4. Hiring trend: application count last 30 days vs previous 30 days
  let hiringTrend: { recent: number; previous: number; trend: "up" | "down" | "flat" } = {
    recent: 0, previous: 0, trend: "flat",
  };

  if (jobIds.length > 0) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [recentApps, previousApps] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(applicationsTable)
        .where(
          sql`${applicationsTable.jobId} = ANY(${sql`ARRAY[${sql.join(jobIds.map(id => sql`${id}`), sql`, `)}]::int[]`}) AND ${applicationsTable.appliedAt} >= ${thirtyDaysAgo}`
        ),
      db.select({ count: sql<number>`count(*)` })
        .from(applicationsTable)
        .where(
          sql`${applicationsTable.jobId} = ANY(${sql`ARRAY[${sql.join(jobIds.map(id => sql`${id}`), sql`, `)}]::int[]`}) AND ${applicationsTable.appliedAt} >= ${sixtyDaysAgo} AND ${applicationsTable.appliedAt} < ${thirtyDaysAgo}`
        ),
    ]);

    const recentCount = Number(recentApps[0]?.count ?? 0);
    const prevCount = Number(previousApps[0]?.count ?? 0);

    hiringTrend = {
      recent: recentCount,
      previous: prevCount,
      trend: recentCount > prevCount ? "up" : recentCount < prevCount ? "down" : "flat",
    };
  }

  // 5. Total applicants across all company jobs
  let totalApplicants = 0;
  if (jobIds.length > 0) {
    const countRes = await db.select({ count: sql<number>`count(*)` })
      .from(applicationsTable)
      .where(sql`${applicationsTable.jobId} = ANY(${sql`ARRAY[${sql.join(jobIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
    totalApplicants = Number(countRes[0]?.count ?? 0);
  }

  res.json({
    topCategory,
    marketSalary,
    topCandidates,
    hiringTrend,
    totalApplicants,
    totalJobs: companyJobs.length,
  });
});

// ── GET /salary-estimate/meta ─────────────────────────────────────────────────
router.get("/salary-estimate/meta", (_req, res): void => {
  res.json({
    countries: SUPPORTED_COUNTRIES,
    categories: SUPPORTED_CATEGORIES,
    levels: SUPPORTED_LEVELS,
  });
});

export default router;

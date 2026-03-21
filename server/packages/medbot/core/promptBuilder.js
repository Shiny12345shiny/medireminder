/**
 * ================================================================
 * medbot/core/promptBuilder.js
 * Assembles the full system prompt from user context + drug data
 * ================================================================
 */

"use strict";

//const config = require("../config");
const path = require("path");
const config = require(path.join(__dirname, "../config"));
console.log("CONFIG IN PROMPTBUILDER:", JSON.stringify(config, null, 2));

/**
 * Build the complete system prompt for groq
 * @param {Object} userContext - from contextBuilder.js
 * @param {Object} drugContext - relevant drug data for this message
 * @returns {string} Full system prompt
 */
function buildSystemPrompt(userContext, drugContext = {}) {
  const sections = [
    buildRoleSection(),
    buildUserProfileSection(userContext),
    buildMedicinesSection(userContext),
    buildRemindersSection(userContext),
    buildAppointmentsSection(userContext),
    buildHealthRecordsSection(userContext),
    buildDrugDataSection(drugContext),
    buildBehaviorGuidelinesSection(),
  ];

  const prompt = sections.filter(Boolean).join("\n\n");

  // Truncate if too long
  if (prompt.length > config.groq.systemPromptMaxLength) {
    return prompt.substring(0, config.groq.systemPromptMaxLength) +
      "\n\n[Context truncated for length]";
  }

  return prompt;
}

// ─────────────────────────────────────────────
// Section Builders
// ─────────────────────────────────────────────

function buildRoleSection() {
  return `You are MedBot, a personalized medical assistant integrated into the Smart Medicine Reminder app. You have access to this patient's complete health data including their medications, schedules, reminders, appointments, and health records. You also have access to a comprehensive medicine database.

Your role is to:
- Answer questions about the patient's specific medications and schedules
- Check drug interactions using the patient's actual medicine list
- Provide personalized advice based on their health history and patterns
- Help them understand side effects, dosages, and timing
- Alert them about missed doses, low stock, and upcoming appointments
- Always recommend consulting their doctor for medical decisions

Today's date and time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;
}

function buildUserProfileSection(ctx) {
  const user = ctx.user;
  if (!user?.name) return null;

  const lines = [`## Patient Profile`, `Name: ${user.name}`];

  if (user.age) lines.push(`Age: ${user.age} years`);
  if (user.gender) lines.push(`Gender: ${user.gender}`);
  if (user.bloodGroup) lines.push(`Blood Group: ${user.bloodGroup}`);

  if (user.medicalHistory?.length) {
    lines.push(`Medical History: ${user.medicalHistory.join(", ")}`);
  }
  if (user.allergies?.length) {
    lines.push(`Known Allergies: ${user.allergies.join(", ")}`);
  }

  return lines.join("\n");
}

function buildMedicinesSection(ctx) {
  const medicines = ctx.medicines;
  if (!medicines?.active?.length) {
    return "## Current Medications\nNo active medications found.";
  }

  const lines = [
    `## Current Medications (${medicines.totalActive} active)`,
  ];

  for (const med of medicines.active) {
    lines.push(`\n### ${med.name}`);
    lines.push(`- Dosage: ${med.dosage}`);
    lines.push(`- Frequency: ${med.frequency}`);
    lines.push(`- Timings: ${med.timings.join(", ") || "not set"}`);
    lines.push(`- Instructions: Take ${med.instructions}`);
    if (med.purpose) lines.push(`- Purpose: ${med.purpose}`);
    if (med.adherenceScore !== undefined) {
      lines.push(`- Adherence Score: ${med.adherenceScore}%`);
    }
    if (med.isLowStock) {
      lines.push(
        `- ⚠️ LOW STOCK: Only ${med.remainingStock} doses remaining`
      );
    }
    if (med.lastTaken) {
      lines.push(`- Last Taken: ${new Date(med.lastTaken).toLocaleString("en-IN")}`);
    }
  }

  if (medicines.lowStock?.length) {
    lines.push(`\n⚠️ Low Stock Alert for: ${medicines.lowStock.map((m) => m.name).join(", ")}`);
  }

  return lines.join("\n");
}

function buildRemindersSection(ctx) {
  const reminders = ctx.reminders;
  if (!reminders) return null;

  const lines = ["## Today's Reminders"];
  const today = reminders.today;

  if (today?.taken?.length) {
    lines.push(`✅ Taken (${today.taken.length}): ${today.taken.map((r) => r.medicine).join(", ")}`);
  }
  if (today?.missed?.length) {
    lines.push(`❌ Missed/Overdue (${today.missed.length}): ${today.missed.map((r) => r.medicine).join(", ")}`);
  }
  if (today?.pending?.length) {
    lines.push(`⏰ Due Soon (${today.pending.length}): ${today.pending.map((r) => r.medicine).join(", ")}`);
  }
  if (today?.upcoming?.length) {
    lines.push(`📅 Upcoming (${today.upcoming.length}): ${today.upcoming.map((r) => r.medicine).join(", ")}`);
  }

  const adherence = reminders.adherence;
  if (adherence?.rate !== null && adherence?.rate !== undefined) {
    lines.push(
      `\n## Adherence (Last ${adherence.windowDays} Days)`,
      `Rate: ${adherence.rate}% (${adherence.taken} taken, ${adherence.missed} missed out of ${adherence.total} total)`
    );
  }

  const pattern = reminders.missedPattern;
  if (pattern?.hasMissedPattern) {
    lines.push(`\n## Missed Dose Patterns`);
    if (pattern.mostMissedMedicine) {
      lines.push(`Most frequently missed: ${pattern.mostMissedMedicine}`);
    }
    const tod = pattern.byTimeOfDay;
    if (tod) {
      const peakTime = Object.entries(tod).sort((a, b) => b[1] - a[1])[0];
      if (peakTime?.[1] > 0) {
        lines.push(`Most missed time of day: ${peakTime[0]}`);
      }
    }
  }

  return lines.join("\n");
}

function buildAppointmentsSection(ctx) {
  const appointments = ctx.appointments;
  if (!appointments) return null;

  const lines = ["## Appointments"];

  if (appointments.upcoming?.length) {
    lines.push("Upcoming:");
    for (const appt of appointments.upcoming) {
      lines.push(
        `- ${appt.doctor} (${appt.specialization || "General"}) on ` +
        `${new Date(appt.date).toLocaleDateString("en-IN")} at ${appt.time} — ${appt.type}`
      );
    }
  } else {
    lines.push("No upcoming appointments.");
  }

  if (appointments.recent?.length) {
    lines.push("Recent:");
    for (const appt of appointments.recent) {
      lines.push(
        `- ${appt.doctor} on ${new Date(appt.date).toLocaleDateString("en-IN")} — ${appt.status}` +
        (appt.diagnosis ? ` — Diagnosis: ${appt.diagnosis}` : "")
      );
    }
  }

  return lines.join("\n");
}

function buildHealthRecordsSection(ctx) {
  const records = ctx.healthRecords;
  if (!records?.recent?.length) return null;

  const lines = ["## Recent Health Records"];
  for (const record of records.recent) {
    lines.push(
      `- [${record.type}] ${record.title} (${new Date(record.date).toLocaleDateString("en-IN")})`
    );
  }

  return lines.join("\n");
}

function buildDrugDataSection(drugCtx) {
  if (!drugCtx || Object.keys(drugCtx).length === 0) return null;

  const lines = ["## Drug Database Information"];

  if (drugCtx.interactions?.length) {
    lines.push("\n### Drug Interactions Found:");
    for (const interaction of drugCtx.interactions) {
      lines.push(
        `- ⚠️ [${interaction.severity}] ${interaction.drug1} + ${interaction.drug2}: ` +
        `${interaction.effect}. Recommendation: ${interaction.recommendation}`
      );
    }
  }

  if (drugCtx.contraindications?.length) {
    lines.push("\n### Contraindications Found:");
    for (const contra of drugCtx.contraindications) {
      lines.push(`- ⛔ ${contra.condition} → ${contra.contraindicationFound}`);
    }
  }

  if (drugCtx.mentionedMedicines?.length) {
    lines.push("\n### Medicines Mentioned in Query:");
    for (const med of drugCtx.mentionedMedicines) {
      lines.push(`- ${med.medicineName} (${med.category}): ${med.uses?.slice(0, 2).join(", ")}`);
    }
  }

  if (drugCtx.dosageInfo) {
    const d = drugCtx.dosageInfo;
    lines.push(`\n### Dosage Info for ${d.medicine}:`);
    if (d.dosage?.adult?.typical) lines.push(`- Typical adult dose: ${d.dosage.adult.typical}`);
    if (d.timing?.withFood !== undefined) {
      lines.push(`- Take with food: ${d.timing.withFood ? "Yes" : "No"}`);
    }
    if (d.timing?.preferredTimes?.length) {
      lines.push(`- Preferred times: ${d.timing.preferredTimes.join(", ")}`);
    }
  }

  return lines.join("\n");
}

function buildBehaviorGuidelinesSection() {
  return `## Response Guidelines
- Be warm, clear, and concise. Avoid medical jargon unless explaining it.
- Always personalize responses using the patient's actual data above.
- For drug interactions or contraindications, always state the severity level.
- If the patient reports side effects, cross-reference with their current medicines.
- Never diagnose conditions or prescribe treatments — always recommend consulting their doctor.
- If you detect a potentially dangerous situation (major drug interaction, severe side effect), clearly flag it with ⚠️ or ⛔.
- Keep responses focused and actionable. If the patient's question is unclear, ask one clarifying question.
- For missed doses, follow standard guidelines: if it's close to the next dose time, skip the missed dose.`;
}

/**
 * Build a quick drug context from pre-fetched drug data
 * @param {Object} options
 */
function buildDrugContext({
  interactions = null,
  contraindications = null,
  mentionedMedicines = null,
  dosageInfo = null,
} = {}) {
  const ctx = {};

  if (interactions?.interactions?.length) {
    ctx.interactions = interactions.interactions;
  }
  if (contraindications?.contraindicationsFound?.length) {
    ctx.contraindications = contraindications.contraindicationsFound;
  }
  if (mentionedMedicines?.length) {
    ctx.mentionedMedicines = mentionedMedicines;
  }
  if (dosageInfo?.success) {
    ctx.dosageInfo = dosageInfo;
  }

  return ctx;
}

module.exports = { buildSystemPrompt, buildDrugContext };
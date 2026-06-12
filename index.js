"use strict";

/* ─────────────────────────────────────
CONFIG
───────────────────────────────────── */
const DAY_MAP = {
	Thursday: "20260611",
	Friday: "20260612",
	Saturday: "20260613",
	Sunday: "20260614",
};

/* ─────────────────────────────────────
DOM
───────────────────────────────────── */
const $input = document.getElementById("scheduleInput");
const $clearBtn = document.getElementById("clearBtn");
const $valMsg = document.getElementById("validationMsg");
const $addNotif = document.getElementById("addNotif");
const $notifMin = document.getElementById("notifMinutes");
const $dlBtn = document.getElementById("downloadBtn");
const $errMsg = document.getElementById("errorMsg");

/* ─────────────────────────────────────
LISTENERS
───────────────────────────────────── */
$input.addEventListener("input", () => {
	$errMsg.textContent = "";
	validate();
});

$clearBtn.addEventListener("click", () => {
	$input.value = "";
	setVal("", "");
	$errMsg.textContent = "";
});

$addNotif.addEventListener("change", () => {
	$notifMin.disabled = !$addNotif.checked;
});

$dlBtn.addEventListener("click", onDownload);

/* ─────────────────────────────────────
VALIDATION
───────────────────────────────────── */
function setVal(text, cls) {
	$valMsg.textContent = text;
	$valMsg.className = "msg-validation" + (cls ? " " + cls : "");
}

function validate() {
	const raw = $input.value.trim();
	if (!raw) {
		setVal("", "");
		return;
	}
	try {
		const s = parseSchedule(raw);
		if (!s.events.length) throw new Error("empty");
		setVal("✓ Everything looks good!", "valid");
	} catch (_) {
		setVal(
			"✗ The schedule looks incorrect - ask Artur Yurko about it",
			"invalid",
		);
	}
}

/* ─────────────────────────────────────
PARSER
───────────────────────────────────── */
function parseSchedule(rawText) {
	const lines = rawText
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);

	if (lines.length < 3) throw new Error("too short");
	if (!lines[0].startsWith("Zeitplan für")) throw new Error("no header");

	// Find "Tag: <DayName> …"
	let dateStr = null,
		tagIdx = -1;
	for (let i = 0; i < lines.length; i++) {
		if (!lines[i].startsWith("Tag:")) continue;
		tagIdx = i;
		for (const [day, d] of Object.entries(DAY_MAP)) {
			if (lines[i].includes(day)) {
				dateStr = d;
				break;
			}
		}
		break;
	}
	if (tagIdx === -1 || !dateStr) throw new Error("bad Tag");

	// Skip optional column-header row ("Time  ToDo  Location")
	let di = tagIdx + 1;
	if (di < lines.length && /^time\b/i.test(lines[di])) di++;

	// Parse event rows  — split on TAB or 2+ spaces
	const TIME_RE = /^\d{2}:\d{2}$/;
	const events = [];
	for (let i = di; i < lines.length; i++) {
		const cols = lines[i].split(/\t+|\s{2,}/);
		const time = cols[0]?.trim() ?? "";
		const title = cols[1]?.trim() ?? "";
		const location = cols.length > 2 ? cols.slice(2).join(" ").trim() : "";
		if (!TIME_RE.test(time) || !title) continue;
		events.push({ time, title, location });
	}

	if (!events.length) throw new Error("no events");
	return { dateStr, events };
}

/* ─────────────────────────────────────
ICS BUILDER
───────────────────────────────────── */
function makeDT(dateStr, hhmm) {
	const [h, m] = hhmm.split(":");
	return `${dateStr}T${h}${m}00`;
}

function addMins(dateStr, hhmm, mins) {
	const [h, m] = hhmm.split(":").map(Number);
	const tot = h * 60 + m + mins;
	const eh = Math.floor(tot / 60) % 24;
	const em = tot % 60;
	return `${dateStr}T${String(eh).padStart(2, "0")}${String(em).padStart(2, "0")}00`;
}

function escICS(s) {
	return String(s)
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "");
}

function buildICS(sched, alarm, alarmMins) {
	const { dateStr, events } = sched;
	const stamp =
		new Date().toISOString().replace(/[:\-]/g, "").split(".")[0] + "Z";

	const rows = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//FlensMUN Schedule Converter//EN",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"X-WR-CALNAME:FlensMUN 2026",
		"X-WR-TIMEZONE:Europe/Berlin",
		// Minimal VTIMEZONE so TZID references resolve
		"BEGIN:VTIMEZONE",
		"TZID:Europe/Berlin",
		"BEGIN:DAYLIGHT",
		"TZOFFSETFROM:+0100",
		"TZOFFSETTO:+0200",
		"TZNAME:CEST",
		"DTSTART:19700329T020000",
		"RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3",
		"END:DAYLIGHT",
		"BEGIN:STANDARD",
		"TZOFFSETFROM:+0200",
		"TZOFFSETTO:+0100",
		"TZNAME:CET",
		"DTSTART:19701025T030000",
		"RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10",
		"END:STANDARD",
		"END:VTIMEZONE",
	];

	events.forEach((ev, i) => {
		const startDT = makeDT(dateStr, ev.time);

		// End = next event's start; if same time or last event → +30 min (last → +60 min)
		let endDT;
		if (i + 1 < events.length) {
			const nextDT = makeDT(dateStr, events[i + 1].time);
			endDT = nextDT > startDT ? nextDT : addMins(dateStr, ev.time, 30);
		} else {
			endDT = addMins(dateStr, ev.time, 60);
		}

		rows.push(
			"BEGIN:VEVENT",
			`UID:flenmun-${dateStr}-${i}-${Date.now()}@flenmun2026`,
			`DTSTAMP:${stamp}`,
			`DTSTART;TZID=Europe/Berlin:${startDT}`,
			`DTEND;TZID=Europe/Berlin:${endDT}`,
			`SUMMARY:${escICS(ev.title)}`,
		);

		if (ev.location && ev.location !== "-") {
			rows.push(`LOCATION:${escICS(ev.location)}`);
		}

		if (alarm) {
			rows.push(
				"BEGIN:VALARM",
				"ACTION:DISPLAY",
				`DESCRIPTION:${escICS(ev.title)}`,
				`TRIGGER:-PT${alarmMins}M`,
				"END:VALARM",
			);
		}

		rows.push("END:VEVENT");
	});

	rows.push("END:VCALENDAR");
	return rows.join("\r\n"); // RFC 5545 requires CRLF
}

/* ─────────────────────────────────────
DOWNLOAD
───────────────────────────────────── */
function onDownload() {
	$errMsg.textContent = "";
	try {
		const raw = $input.value.trim();
		if (!raw) throw new Error("empty");

		const sched = parseSchedule(raw);
		const alarm = $addNotif.checked;
		const mins = Math.max(1, parseInt($notifMin.value, 10) || 5);
		const content = buildICS(sched, alarm, mins);

		const blob = new Blob([content], {
			type: "text/calendar;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const a = Object.assign(document.createElement("a"), {
			href: url,
			download: "flenmun-schedule.ics",
		});
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	} catch (e) {
		$errMsg.textContent =
			"Ooops, failed to generate the schedule. Please, ask Artur Yurko about it.";
		console.error("[FlensMUN]", e);
	}
}

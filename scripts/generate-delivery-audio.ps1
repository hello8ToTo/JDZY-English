$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$appPath = Join-Path $repoRoot 'app.js'
$outputDir = Join-Path $repoRoot 'assets\delivery-audio'

$extract = @'
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(process.argv[1], 'utf8').replace(/\r\n/g, '\n');
function readConstant(name, nextName) {
  const startMarker = `const ${name} = `;
  const endMarker = `;\nconst ${nextName}`;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Cannot find ${name}`);
  return vm.runInNewContext(`(${source.slice(start + startMarker.length, end)})`);
}
const cases = readConstant('deliveryCaseBank', 'deliveryCustomerGenders');
const genders = readConstant('deliveryCustomerGenders', 'deliveryPortraits');
const records = Object.entries(cases).flatMap(([country, items]) => items.map((item, index) => ({
  country, index: index + 1, text: item[2], gender: genders[country][index]
})));
if (records.length !== 16 || records.some(item => !['male', 'female'].includes(item.gender))) {
  throw new Error('Expected 16 cases with explicit customer genders');
}
process.stdout.write(JSON.stringify(records));
'@

$json = & node -e $extract $appPath
if ($LASTEXITCODE -ne 0) { throw 'Could not read delivery cases from app.js' }
$records = $json | ConvertFrom-Json

Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$installedVoices = @($speaker.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name })
$maleVoice = 'Microsoft David Desktop'
$femaleVoice = 'Microsoft Zira Desktop'
if ($maleVoice -notin $installedVoices -or $femaleVoice -notin $installedVoices) {
  throw 'Required Microsoft English male and female voices are not installed'
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
try {
  foreach ($record in $records) {
    $filePath = Join-Path $outputDir ('{0}-{1}.wav' -f $record.country, $record.index)
    $voice = if ($record.gender -eq 'female') { $femaleVoice } else { $maleVoice }
    $speaker.SelectVoice($voice)
    $speaker.Rate = 0
    $speaker.SetOutputToWaveFile($filePath)
    try { $speaker.Speak([string]$record.text) }
    finally { $speaker.SetOutputToNull() }
    Write-Output ('{0}: {1}' -f (Split-Path -Leaf $filePath), $voice)
  }
}
finally { $speaker.Dispose() }

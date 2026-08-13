[CmdletBinding()]
param(
    [string]$Python = "python",
    [string]$Validator
)

$ErrorActionPreference = "Stop"
$skillRoot = Split-Path -Parent $PSScriptRoot

if (-not $Validator) {
    $codexRoot = if ($env:CODEX_HOME) {
        $env:CODEX_HOME
    } else {
        Join-Path $env:USERPROFILE ".codex"
    }
    $Validator = Join-Path $codexRoot "skills\.system\skill-creator\scripts\quick_validate.py"
}

function Invoke-Python {
    param([string[]]$Arguments)

    & $Python @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Python command failed with exit code $LASTEXITCODE."
    }
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $Python -c "import yaml" *> $null
$yamlProbeExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference

if ($yamlProbeExitCode -ne 0) {
    Write-Host "PyYAML is missing; installing PyYAML>=6,<7 into the selected Python runtime."
    Invoke-Python -Arguments @(
        "-m",
        "pip",
        "install",
        "PyYAML>=6,<7"
    )
}

Invoke-Python -Arguments @(
    "-c",
    "import yaml; print('PyYAML ' + yaml.__version__)"
)

if (-not (Test-Path -LiteralPath $Validator -PathType Leaf)) {
    throw "Skill Creator validator not found: $Validator"
}

Invoke-Python -Arguments @(
    $Validator,
    $skillRoot
)


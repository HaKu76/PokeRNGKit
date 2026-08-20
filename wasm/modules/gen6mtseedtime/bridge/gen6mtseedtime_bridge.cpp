/*
 * PokeRNGKit Gen VI TinyFinder MT Seed Time Finder bridge.
 * Adapted from TinyFinder Subforms/MT/Core.cs and Utils/Calculate.cs.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6mtseedtime_bridge.h"
#include <array>
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace {
constexpr std::uint32_t apiVersion = 1;
constexpr std::uint32_t dateFrames = 200'000;
constexpr std::uint32_t maxSeconds = 5'000'000;
constexpr std::uint32_t maxResults = 100'000;
constexpr std::uint64_t epochOffset = 946'684'800'000ULL;
enum Index : std::size_t { Mode, Game, Frame300Seed, CurrentSavePar, TargetSeed, EpochLow, EpochHigh, MaxSeconds, SpecificDate, ResultLimit };
struct Result { std::uint32_t words[8]{}; };
struct Context { std::array<std::uint32_t, 10> request{}; std::vector<Result> results; std::vector<std::uint32_t> dateSavePars; std::uint32_t cursor = 0; std::uint32_t processed = 0; std::uint32_t stepProcessed = 0; std::uint32_t totalResults = 0; bool active = false; bool done = false; bool limitReached = false; std::uint32_t error = 0; };
thread_local Context context;

class MersenneTwisterFast {
  static constexpr std::size_t n = 624, m = 397; static constexpr std::uint32_t a = 0x9908b0dfU, upper = 0x80000000U, lower = 0x7fffffffU, b = 0x9d2c5680U, c = 0xefc60000U;
  std::array<std::uint32_t, n> state{}; std::size_t index = n;
  void twist() { std::size_t k = 0; for (; k < n - m; ++k) { const auto y = (state[k] & upper) | (state[k + 1] & lower); state[k] = state[k + m] ^ (y >> 1) ^ ((y & 1U) ? a : 0U); } for (; k < n - 1; ++k) { const auto y = (state[k] & upper) | (state[k + 1] & lower); state[k] = state[k + (m - n)] ^ (y >> 1) ^ ((y & 1U) ? a : 0U); } const auto y = (state[n - 1] & upper) | (state[0] & lower); state[n - 1] = state[m - 1] ^ (y >> 1) ^ ((y & 1U) ? a : 0U); }
public:
  explicit MersenneTwisterFast(std::uint32_t seed) { state[0] = seed; for (std::size_t i = 1; i < n; ++i) state[i] = 1812433253U * (state[i - 1] ^ (state[i - 1] >> 30)) + static_cast<std::uint32_t>(i); }
  std::uint32_t next() { if (index >= n) { twist(); index = 0; } auto value = state[index++]; value ^= value >> 11; value ^= (value << 7) & b; value ^= (value << 15) & c; value ^= value >> 18; return value; }
};

std::uint64_t epoch() { return static_cast<std::uint64_t>(context.request[EpochLow]) | (static_cast<std::uint64_t>(context.request[EpochHigh]) << 32); }
std::uint32_t requiredSavePar() { const auto currentMs = epoch(); const auto expected = context.request[CurrentSavePar] + static_cast<std::uint32_t>(currentMs); const auto correction = expected - context.request[Frame300Seed]; return context.request[TargetSeed] - static_cast<std::uint32_t>(currentMs) + correction; }
bool valid(const std::uint32_t *request) { return request && request[Mode] <= 1 && request[Game] <= 1 && request[MaxSeconds] <= maxSeconds && request[ResultLimit] > 0 && request[ResultLimit] <= maxResults && (static_cast<std::uint64_t>(request[EpochHigh]) << 32 | request[EpochLow]) % 1000ULL == 0; }
void push(std::uint64_t resultEpoch, std::uint32_t seed, std::int32_t saveFrame, std::uint32_t savePar, std::uint32_t offset) { if (context.totalResults >= context.request[ResultLimit]) { context.limitReached = true; return; } Result result; result.words[0] = static_cast<std::uint32_t>(resultEpoch); result.words[1] = static_cast<std::uint32_t>(resultEpoch >> 32); result.words[2] = seed; result.words[3] = static_cast<std::uint32_t>(saveFrame); result.words[4] = savePar; result.words[5] = offset; result.words[6] = context.request[Mode]; result.words[7] = context.request[Game]; context.results.push_back(result); ++context.totalResults; if (context.totalResults >= context.request[ResultLimit]) context.limitReached = true; }
void processTime(std::uint32_t offset) { const auto required = requiredSavePar(); const auto seed = context.request[Frame300Seed] + offset * 1000U; MersenneTwisterFast rng(seed); for (std::uint32_t frame = 0; frame < 2000; ++frame) static_cast<void>(rng.next()); const auto saveDelay = context.request[Game] ? 23 : 25; for (std::uint32_t frame = 2000; frame < 10'000 && !context.limitReached; ++frame) if (rng.next() == required) push(epoch() + static_cast<std::uint64_t>(offset) * 1000ULL, seed, static_cast<std::int32_t>(frame) - saveDelay, required, offset); }
void processDateFrame(std::uint32_t frame) { const auto required = requiredSavePar(); const auto savePar = context.dateSavePars[frame]; const auto difference = required - savePar; if (difference % 1000U != 0) return; const auto seconds = difference / 1000U; if (context.request[SpecificDate] != 0 && seconds >= 86'400U) return; const auto saveDelay = context.request[Game] ? 23 : 25; push(epoch() + static_cast<std::uint64_t>(seconds) * 1000ULL, context.request[Frame300Seed], static_cast<std::int32_t>(frame) - saveDelay, savePar, seconds); }
}

extern "C" {
std::uint32_t gen6mtseedtime_api_version() { return apiVersion; }
std::uint32_t gen6mtseedtime_begin(const std::uint32_t *request) { context = Context{}; if (!valid(request)) { context.error = 1; return 0; } std::copy(request, request + 10, context.request.begin()); context.active = true; context.results.reserve(1024); if (context.request[Mode] == 0) { context.dateSavePars.resize(dateFrames); MersenneTwisterFast rng(context.request[Frame300Seed]); for (auto &value : context.dateSavePars) value = rng.next(); } return 1; }
std::uint32_t gen6mtseedtime_step(std::uint32_t maximumStates) { context.results.clear(); context.stepProcessed = 0; if (!context.active || maximumStates == 0) { context.error = 1; return 0; } const auto total = context.request[Mode] == 1 ? context.request[MaxSeconds] + 1 : dateFrames; while (context.stepProcessed < maximumStates && context.cursor < total && !context.limitReached) { if (context.request[Mode] == 1) processTime(context.cursor); else processDateFrame(context.cursor); ++context.cursor; ++context.stepProcessed; ++context.processed; } if (context.cursor >= total || context.limitReached) context.done = true; return static_cast<std::uint32_t>(context.results.size()); }
std::uintptr_t gen6mtseedtime_result_ptr() { return context.results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(context.results.data()->words); }
std::uint32_t gen6mtseedtime_result_count() { return static_cast<std::uint32_t>(context.results.size()); }
std::uint32_t gen6mtseedtime_step_processed() { return context.stepProcessed; }
std::uint32_t gen6mtseedtime_total_processed() { return context.processed; }
std::uint32_t gen6mtseedtime_done() { return context.done ? 1U : 0U; }
std::uint32_t gen6mtseedtime_limit_reached() { return context.limitReached ? 1U : 0U; }
std::uint32_t gen6mtseedtime_last_error() { return context.error; }
}

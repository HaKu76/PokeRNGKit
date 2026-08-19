/*
 * PokeRNGKit Gen VI TinyFinder MT Seed WebAssembly bridge.
 * Adapted from TinyFinder Subforms/MT, RNG/MT.cs and FastHordes.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6mtseed_bridge.h"

#include <array>
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace {
constexpr std::uint32_t apiVersion = 1;
constexpr std::uint32_t maxFrame = 10'000'000;
constexpr std::uint32_t maxMinFrame = 100'000;
constexpr std::uint32_t maxResults = 100'000;
constexpr std::size_t ivCount = 6;
constexpr std::uint32_t allNatures = 0x1ff'ffffU;

enum RequestIndex : std::size_t {
    Mode,
    StartSeed,
    EndSeed,
    MinFrame,
    MaxFrame,
    DesiredPid,
    Tsv,
    Trv,
    ShinyType,
    IvMode,
    PerfectIvs,
    SpecificIvMask,
    NatureMask,
    MinIv0,
    MinIv1,
    MinIv2,
    MinIv3,
    MinIv4,
    MinIv5,
    MaxIv0,
    MaxIv1,
    MaxIv2,
    MaxIv3,
    MaxIv4,
    MaxIv5,
    AbilityLocked,
    PossibleHa,
    NiceEc,
    HordeShinies,
    AnyTsv,
    Fast,
    ShowUnown,
    ResultLimit,
};

struct Result {
    std::uint32_t words[32]{};
};

struct Context {
    std::array<std::uint32_t, 33> request{};
    std::vector<Result> results;
    std::uint32_t nextSeed = 0;
    std::uint32_t processed = 0;
    std::uint32_t stepProcessed = 0;
    std::uint32_t totalResults = 0;
    bool active = false;
    bool done = false;
    bool limitReached = false;
    std::uint32_t error = 0;
};

thread_local Context context;

class MersenneTwisterFast {
    static constexpr std::size_t n = 624;
    static constexpr std::size_t m = 397;
    static constexpr std::uint32_t matrixA = 0x9908b0dfU;
    static constexpr std::uint32_t upperMask = 0x80000000U;
    static constexpr std::uint32_t lowerMask = 0x7fffffffU;
    static constexpr std::uint32_t maskB = 0x9d2c5680U;
    static constexpr std::uint32_t maskC = 0xefc60000U;

    std::array<std::uint32_t, n> state{};
    std::size_t index = n;

    void twist() {
        std::size_t k = 0;
        for (; k < n - m; ++k) {
            const auto y = (state[k] & upperMask) | (state[k + 1] & lowerMask);
            state[k] = state[k + m] ^ (y >> 1) ^ ((y & 1U) != 0 ? matrixA : 0U);
        }
        for (; k < n - 1; ++k) {
            const auto y = (state[k] & upperMask) | (state[k + 1] & lowerMask);
            state[k] = state[k + (m - n)] ^ (y >> 1) ^ ((y & 1U) != 0 ? matrixA : 0U);
        }
        const auto y = (state[n - 1] & upperMask) | (state[0] & lowerMask);
        state[n - 1] = state[m - 1] ^ (y >> 1) ^ ((y & 1U) != 0 ? matrixA : 0U);
    }

public:
    explicit MersenneTwisterFast(std::uint32_t seed) {
        state[0] = seed;
        for (std::size_t i = 1; i < n; ++i)
            state[i] = 1812433253U * (state[i - 1] ^ (state[i - 1] >> 30)) + static_cast<std::uint32_t>(i);
    }

    std::uint32_t next() {
        if (index >= n) {
            twist();
            index = 0;
        }
        auto value = state[index++];
        value ^= value >> 11;
        value ^= (value << 7) & maskB;
        value ^= (value << 15) & maskC;
        value ^= value >> 18;
        return value;
    }

    void skip(std::uint32_t count) {
        while (count-- > 0) static_cast<void>(next());
    }
};

std::uint32_t randomRange(std::uint32_t value, std::uint32_t maximum) {
    return static_cast<std::uint32_t>((static_cast<std::uint64_t>(value) * maximum) >> 32);
}

std::uint32_t psv(std::uint32_t pid) { return ((pid >> 16) ^ (pid & 0xffffU)) >> 4; }
std::uint32_t prv(std::uint32_t pid) { return ((pid >> 16) ^ (pid & 0xffffU)) & 0xfU; }

bool validIvs(const std::array<std::uint32_t, 33> &request, std::size_t offset) {
    for (std::size_t i = 0; i < ivCount; ++i)
        if (request[offset + i] > 31) return false;
    return true;
}

bool valid(const std::uint32_t *request) {
    if (request == nullptr || request[Mode] > 5 || request[StartSeed] > request[EndSeed] ||
        request[MinFrame] > request[MaxFrame] || request[MinFrame] > maxMinFrame || request[MaxFrame] > maxFrame ||
        request[DesiredPid] > 0xffff'ffffU || request[Tsv] > 4095 || request[Trv] > 15 ||
        request[ShinyType] > 3 || request[IvMode] > 1 || request[PerfectIvs] > 3 ||
        request[SpecificIvMask] > 63 || request[NatureMask] == 0 || request[NatureMask] > allNatures ||
        !validIvs(*reinterpret_cast<const std::array<std::uint32_t, 33> *>(request), MinIv0) ||
        !validIvs(*reinterpret_cast<const std::array<std::uint32_t, 33> *>(request), MaxIv0) ||
        request[AbilityLocked] > 1 || request[PossibleHa] > 1 || request[NiceEc] > 1 ||
        request[HordeShinies] < 2 || request[HordeShinies] > 5 || request[AnyTsv] > 1 ||
        request[Fast] > 1 || request[ShowUnown] > 1 || request[ResultLimit] == 0 ||
        request[ResultLimit] > maxResults)
        return false;
    if (request[Mode] == 5 && request[EndSeed] - request[StartSeed] + 1 > 5'000'000U)
        return false;
    for (std::size_t i = 0; i < ivCount; ++i)
        if (request[MaxIv0 + i] < request[MinIv0 + i]) return false;
    return true;
}

void push(const std::array<std::uint32_t, 32> &words) {
    if (context.totalResults >= context.request[ResultLimit]) {
        context.limitReached = true;
        return;
    }
    Result result;
    std::copy(words.begin(), words.end(), result.words);
    context.results.push_back(result);
    ++context.totalResults;
    if (context.totalResults >= context.request[ResultLimit]) context.limitReached = true;
}

bool natureAllowed(std::uint32_t nature) {
    return (context.request[NatureMask] & (1U << nature)) != 0;
}

void ivPrepare(std::array<std::uint32_t, 6> &ivs) {
    if (context.request[IvMode] != 1) return;
    for (std::size_t i = 0; i < ivCount; ++i)
        if ((context.request[SpecificIvMask] & (1U << i)) != 0) ivs[i] = 31;
}

bool findIvsNature(const std::vector<std::uint32_t> &pidList, std::uint32_t frame,
                   std::array<std::uint32_t, 6> &ivs, std::uint32_t &nature,
                   std::uint32_t &ability, bool filterNature) {
    for (std::uint32_t count = context.request[IvMode] == 0 ? context.request[PerfectIvs] : 0; count > 0;) {
        ++frame;
        const auto slot = randomRange(pidList[frame], 6);
        if (ivs[slot] == 0) {
            ivs[slot] = 31;
            --count;
        }
    }
    for (auto &iv : ivs) {
        if (iv != 0) continue;
        ++frame;
        iv = pidList[frame] >> 27;
    }
    for (std::size_t i = 0; i < ivCount; ++i)
        if (ivs[i] < context.request[MinIv0 + i] || ivs[i] > context.request[MaxIv0 + i]) return false;
    const auto natureFrame = frame + (context.request[AbilityLocked] != 0 ? 1U : 2U);
    nature = randomRange(pidList[natureFrame], 25);
    if (filterNature && !natureAllowed(nature)) return false;
    ability = context.request[AbilityLocked] != 0 ? 0 : (context.request[PossibleHa] != 0 ? randomRange(pidList[frame + 1], 3) : pidList[frame + 1] >> 31) + 1;
    return true;
}

std::uint32_t packedUnown(const std::vector<std::uint32_t> &pidList, std::uint32_t frame) {
    if (context.request[ShowUnown] == 0) return 0;
    return randomRange(pidList[frame + 1], 28) |
           (randomRange(pidList[frame + 2], 28) << 8) |
           (randomRange(pidList[frame + 3], 28) << 16);
}

std::array<std::uint32_t, 32> baseResult(std::uint32_t seed, std::uint32_t frame, std::uint32_t pid) {
    std::array<std::uint32_t, 32> result{};
    result[0] = seed;
    result[1] = frame;
    result[2] = pid;
    result[3] = psv(pid);
    result[4] = prv(pid);
    return result;
}

void appendPidResult(std::uint32_t seed, std::uint32_t frame, std::uint32_t pid,
                     const std::array<std::uint32_t, 6> &ivs, std::uint32_t nature,
                     std::uint32_t ability, std::uint32_t unown, std::uint32_t count8 = 0) {
    auto result = baseResult(seed, frame, pid);
    for (std::size_t i = 0; i < ivCount; ++i) result[5 + i] = ivs[i];
    result[17] = nature;
    result[18] = ability;
    result[19] = unown;
    result[20] = count8;
    push(result);
}

void processIv(std::uint32_t seed, std::uint32_t frame, const std::vector<std::uint32_t> &pids) {
    const auto pid = pids[frame];
    const auto currentPsv = psv(pid);
    if (currentPsv != context.request[Tsv] && context.request[ShinyType] != 0) return;
    if (currentPsv == context.request[Tsv] && context.request[ShinyType] != 0) {
        const auto currentPrv = prv(pid);
        if (context.request[ShinyType] == 1 && currentPrv == context.request[Trv]) return;
        if (context.request[ShinyType] == 2 && currentPrv != context.request[Trv]) return;
    }
    std::array<std::uint32_t, 6> ivs{};
    ivPrepare(ivs);
    std::uint32_t nature = 0;
    std::uint32_t ability = 0;
    if (findIvsNature(pids, frame, ivs, nature, ability, true))
        appendPidResult(seed, frame, pid, ivs, nature, ability, packedUnown(pids, frame));
}

void processPid(std::uint32_t seed, std::uint32_t frame, const std::vector<std::uint32_t> &pids, bool ec) {
    if (pids[frame] != context.request[DesiredPid]) return;
    const auto actualFrame = frame + (ec ? 1U : 0U);
    std::array<std::uint32_t, 6> ivs1{};
    ivPrepare(ivs1);
    std::uint32_t nature = 0;
    std::uint32_t ability = 0;
    if (!ec) {
        if (findIvsNature(pids, actualFrame, ivs1, nature, ability, true))
            appendPidResult(seed, actualFrame, context.request[DesiredPid], ivs1, nature, ability, packedUnown(pids, actualFrame));
        return;
    }
    std::array<std::uint32_t, 6> ivs2{};
    const auto firstMatches = findIvsNature(pids, actualFrame, ivs1, nature, ability, false);
    const auto secondMatches = findIvsNature(pids, actualFrame + 2, ivs2, nature, ability, false);
    if (firstMatches || secondMatches) {
        auto result = baseResult(seed, actualFrame, context.request[DesiredPid]);
        for (std::size_t i = 0; i < ivCount; ++i) {
            result[5 + i] = ivs1[i];
            result[11 + i] = ivs2[i];
        }
        result[19] = pids[frame];
        push(result);
    }
}

void processPidReroll(std::uint32_t seed, std::uint32_t frame, const std::vector<std::uint32_t> &pids) {
    if ((pids[frame] >> 16) != (context.request[DesiredPid] >> 16)) return;
    std::array<std::uint32_t, 6> ivs{};
    std::uint32_t nature = 0;
    std::uint32_t ability = 0;
    if (findIvsNature(pids, frame, ivs, nature, ability, true))
        appendPidResult(seed, frame, context.request[DesiredPid], ivs, nature, ability, packedUnown(pids, frame));
}

bool niceEc(std::uint32_t value) {
    constexpr std::array<char, 5> digits{'6', '7', '8', '9', 'A'};
    const auto text = std::to_string(value);
    static_cast<void>(text);
    for (std::size_t i = 0; i < 8; ++i) {
        const auto nibble = (value >> ((7 - i) * 4)) & 0xfU;
        const auto digit = nibble < 10 ? static_cast<char>('0' + nibble) : static_cast<char>('A' + nibble - 10);
        bool match = false;
        for (const auto allowed : digits) if (digit == allowed) match = true;
        if (!match) return false;
    }
    return true;
}

void processEcPid(std::uint32_t seed, std::uint32_t frame, const std::vector<std::uint32_t> &pids) {
    const auto pid = pids[frame];
    const auto ec = pids[frame + 1];
    if ((pid >> 16) != (ec >> 16) || (context.request[NiceEc] != 0 && !niceEc(pid))) return;
    std::array<std::uint32_t, 6> ivs{};
    std::uint32_t nature = 0;
    std::uint32_t ability = 0;
    if (!findIvsNature(pids, frame + 1, ivs, nature, ability, true)) return;
    std::uint32_t count8 = 0;
    for (std::size_t i = 0; i < 8; ++i) if (((pid >> ((7 - i) * 4)) & 0xfU) == 8) ++count8;
    appendPidResult(seed, frame + 1, pid, ivs, nature, ability, packedUnown(pids, frame + 1), count8);
    context.results.back().words[19] = ec;
}

bool setJumps(std::uint32_t seed, std::uint32_t frame, std::uint32_t targetPsv,
              const std::vector<std::uint32_t> &pids, bool sync, bool genderless,
              bool carbink, bool iv3, std::uint32_t ha, std::uint32_t charm) {
    const auto defaultJump = (sync && genderless) ? 9U : (sync || genderless) ? 10U : 11U;
    std::array<std::uint32_t, 5> jumps{defaultJump, defaultJump, defaultJump, defaultJump, defaultJump};
    if (carbink) --jumps[3];
    if (ha != 0) --jumps[ha - 1];
    const auto firstFrame = frame;
    std::array<std::uint32_t, 5> shinyFrames{};
    std::uint32_t count = 0;
    for (std::size_t r = 0; r < 5; ++r) {
        for (std::uint32_t reroll = charm; reroll > 0; --reroll) {
            const auto currentPsv = psv(pids[frame]);
            if (currentPsv != targetPsv) {
                if (reroll != 1) ++frame;
            } else {
                reroll = 0;
            }
        }
        if (iv3) {
            std::array<bool, 6> ivs{};
            std::uint32_t needed = 3;
            while (needed > 0) {
                ++frame;
                const auto slot = randomRange(pids[frame], 6);
                if (!ivs[slot]) { ivs[slot] = true; --needed; }
            }
            frame -= 3;
        }
        if (psv(pids[frame]) == targetPsv) shinyFrames[count++] = frame;
        frame += jumps[r];
    }
    if (count < context.request[HordeShinies]) return false;
    auto result = baseResult(seed, firstFrame, targetPsv);
    result[2] = targetPsv;
    result[3] = targetPsv;
    for (std::size_t i = 0; i < 5; ++i) result[22 + i] = shinyFrames[i] - shinyFrames[0];
    result[27] = iv3 ? (genderless ? 1U : 2U) : (genderless ? 3U : carbink ? 4U : 0U);
    result[20] = charm;
    result[21] = sync ? 1U : 0U;
    result[28] = ha;
    push(result);
    return true;
}

bool checkAll(std::uint32_t seed, std::uint32_t frame, std::uint32_t targetPsv, const std::vector<std::uint32_t> &pids) {
    for (std::uint32_t charm : {1U, 3U})
        for (std::uint32_t ha = 0; ha < 5; ++ha)
            for (std::uint32_t sync = 0; sync < 2; ++sync) {
                if (setJumps(seed, frame, targetPsv, pids, sync != 0, false, false, false, ha, charm)) return true;
                if (setJumps(seed, frame, targetPsv, pids, sync != 0, true, false, false, ha, charm)) return true;
                if (setJumps(seed, frame, targetPsv, pids, sync != 0, true, false, true, ha, charm)) return true;
                if (setJumps(seed, frame, targetPsv, pids, sync != 0, false, false, true, ha, charm)) return true;
                if (setJumps(seed, frame, targetPsv, pids, sync != 0, false, true, false, ha, charm)) return true;
            }
    return false;
}

void processHorde(std::uint32_t seed, std::uint32_t minFrame, std::uint32_t maxFrame) {
    const auto size = static_cast<std::size_t>(maxFrame) + 160;
    std::vector<std::uint32_t> pids(size);
    MersenneTwisterFast rng(seed);
    rng.skip(minFrame + 62);
    for (std::uint32_t frame = minFrame; frame < minFrame + 80; ++frame) pids[frame] = rng.next();
    for (std::uint32_t frame = minFrame; frame < maxFrame; ++frame) {
        pids[frame + 80] = rng.next();
        const auto targetPsv = psv(pids[frame]);
        std::uint32_t count = 1;
        for (std::uint32_t offset = 8; offset < 53; ++offset) if (psv(pids[frame + offset]) == targetPsv) ++count;
        if ((context.request[AnyTsv] != 0 ? count >= context.request[HordeShinies] : targetPsv == context.request[Tsv]) && !checkAll(seed, frame, targetPsv, pids)) continue;
        if (context.limitReached) return;
    }
}

void processSeed(std::uint32_t seed) {
    auto &request = context.request;
    if (request[Mode] == 5) { processHorde(seed, request[MinFrame], request[MaxFrame]); return; }
    const auto size = static_cast<std::size_t>(request[MaxFrame]) + 100;
    std::vector<std::uint32_t> pids(size);
    MersenneTwisterFast rng(seed);
    rng.skip(request[MinFrame] + 62);
    for (std::uint32_t frame = request[MinFrame]; frame < request[MinFrame] + 20; ++frame) pids[frame] = rng.next();
    for (std::uint32_t frame = request[MinFrame]; frame < request[MaxFrame]; ++frame) {
        pids[frame + 20] = rng.next();
        switch (request[Mode]) {
            case 0: processIv(seed, frame, pids); break;
            case 1: processPid(seed, frame, pids, false); break;
            case 2: processPid(seed, frame, pids, true); break;
            case 3: processPidReroll(seed, frame, pids); break;
            case 4: processEcPid(seed, frame, pids); break;
            default: break;
        }
        if (context.limitReached) return;
    }
}
} // namespace

extern "C" {
std::uint32_t gen6mtseed_api_version() { return apiVersion; }

std::uint32_t gen6mtseed_begin(const std::uint32_t *request) {
    context = Context{};
    if (!valid(request)) { context.error = 1; return 0; }
    std::copy(request, request + context.request.size(), context.request.begin());
    context.nextSeed = request[StartSeed];
    context.active = true;
    context.results.reserve(1024);
    return 1;
}

std::uint32_t gen6mtseed_step(std::uint32_t maximum_states) {
    context.results.clear();
    context.stepProcessed = 0;
    if (!context.active || maximum_states == 0) { context.error = 1; return 0; }
    while (context.stepProcessed < maximum_states && context.nextSeed <= context.request[EndSeed] && !context.limitReached) {
        processSeed(context.nextSeed);
        ++context.stepProcessed;
        ++context.processed;
        if (context.nextSeed == context.request[EndSeed]) { context.done = true; break; }
        ++context.nextSeed;
    }
    if (context.nextSeed > context.request[EndSeed] || context.limitReached) context.done = true;
    return static_cast<std::uint32_t>(context.results.size());
}

std::uintptr_t gen6mtseed_result_ptr() { return context.results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(context.results.data()->words); }
std::uint32_t gen6mtseed_result_count() { return static_cast<std::uint32_t>(context.results.size()); }
std::uint32_t gen6mtseed_step_processed() { return context.stepProcessed; }
std::uint32_t gen6mtseed_total_processed() { return context.processed; }
std::uint32_t gen6mtseed_done() { return context.done ? 1U : 0U; }
std::uint32_t gen6mtseed_limit_reached() { return context.limitReached ? 1U : 0U; }
std::uint32_t gen6mtseed_last_error() { return context.error; }
}

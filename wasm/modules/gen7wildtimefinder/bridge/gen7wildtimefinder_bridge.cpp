/*
 * PokeRNGKit Gen VII Wild Time Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Wild search behavior is adapted from 3DSTimeFinder by Admiral-Fish
 * (GPL-3.0-or-later), including its WildSearcher7 frame-consumption rules.
 */
#include "gen7wildtimefinder_bridge.h"

#include "../../gen7common/gen7_rng.hpp"

#include <array>
#include <cstdint>
#include <memory>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

namespace
{
    using pokerngkit::gen7::SFMT;

    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint32_t browserMaximumFrame = 5'000'000;
    constexpr std::uint32_t maximumResults = 100'000;
    constexpr std::uint32_t maximumStepStates = 65'536;
    constexpr std::uint32_t allNatures = 0x1ff'ffff;
    constexpr std::array<std::uint8_t, 10> grassSlots = { 19, 39, 49, 59, 69, 79, 89, 94, 98, 99 };
    constexpr std::array<std::uint8_t, 3> fishSlots = { 78, 98, 99 };

    enum ErrorCode : std::uint32_t { None = 0, InvalidInput = 1, SessionMissing = 2, InvalidStep = 3 };

    class RNGList
    {
      public:
        RNGList(std::uint32_t seed, std::uint32_t frame) : rng(seed)
        {
            rng.advance(frame);
            for (auto &value : values) value = rng.nextUlong();
        }

        std::uint64_t getValue()
        {
            pointer &= 127U;
            return values[pointer++];
        }

        void advanceFrames(std::uint32_t count)
        {
            for (std::uint32_t index = 0; index < count; index++) (void)getValue();
        }

        void advanceState()
        {
            head &= 127U;
            values[head++] = rng.nextUlong();
            pointer = head;
        }

      private:
        SFMT rng;
        std::array<std::uint64_t, 128> values{};
        std::uint32_t head = 0;
        std::uint32_t pointer = 0;
    };

    struct GeneratedResult
    {
        std::uint32_t ec = 0;
        std::uint32_t pid = 0;
        std::array<std::uint32_t, 6> ivs{};
        std::uint32_t nature = 0;
        std::uint32_t ability = 0;
        std::uint32_t gender = 255;
        std::uint32_t hiddenPower = 0;
        std::uint32_t shiny = 0;
        std::uint32_t slot = 0;
    };

    std::uint32_t psv(std::uint32_t pid) { return (pid >> 16U) ^ (pid & 0xffffU); }

    std::uint32_t shiny(std::uint32_t pid, std::uint32_t tsv)
    {
        const auto value = psv(pid);
        return value == tsv ? 2U : ((value ^ tsv) < 16U ? 1U : 0U);
    }

    std::uint32_t hiddenPower(const std::array<std::uint32_t, 6> &ivs)
    {
        constexpr std::array<int, 6> order = { 0, 1, 2, 5, 3, 4 };
        std::uint32_t value = 0;
        for (int index = 0; index < 6; index++) value |= (ivs[order[index]] & 1U) << index;
        return value * 15U / 63U;
    }

    std::uint32_t slot(std::uint32_t type, std::uint8_t value)
    {
        if (type == 0)
        {
            for (std::uint32_t index = 0; index < grassSlots.size(); index++)
                if (value <= grassSlots[index]) return index + 1;
        }
        else
        {
            for (std::uint32_t index = 0; index < fishSlots.size(); index++)
                if (value <= fishSlots[index]) return index + 1;
        }
        return 255;
    }

    GeneratedResult generate(RNGList &rng, const Gen7WildTimeFinderPackedRequest &request)
    {
        GeneratedResult result;
        const bool synchronize = request.useSynchronize != 0 && rng.getValue() % 100U >= 50U;
        result.slot = slot(request.encounterType, static_cast<std::uint8_t>(rng.getValue() % 100U));
        rng.advanceFrames(62);
        result.ec = static_cast<std::uint32_t>(rng.getValue());
        const auto tsv = request.tid ^ request.sid;
        const auto pidCount = request.shinyCharm != 0 ? 3U : 1U;
        for (std::uint32_t index = 0; index < pidCount; index++)
        {
            result.pid = static_cast<std::uint32_t>(rng.getValue());
            result.shiny = shiny(result.pid, tsv);
            if (result.shiny != 0) break;
        }
        for (auto &iv : result.ivs) iv = static_cast<std::uint32_t>(rng.getValue() & 0x1fU);
        result.hiddenPower = hiddenPower(result.ivs);
        result.ability = static_cast<std::uint32_t>(rng.getValue() & 1U);
        result.nature = synchronize ? request.synchronizeNature : static_cast<std::uint32_t>(rng.getValue() % 25U);
        result.gender = request.genderRatio > 0 && request.genderRatio < 254
                            ? (rng.getValue() % 252U >= request.genderRatio ? 0U : 1U)
                            : request.genderRatio;
        return result;
    }

    bool matches(const Gen7WildTimeFinderPackedRequest &request, const GeneratedResult &result)
    {
        if (request.filtersDisabled != 0) return true;
        if (request.shinyFilter == 1 && result.shiny == 0) return false;
        if (request.shinyFilter == 2 && result.shiny != 2) return false;
        const auto packedGender = result.gender < 2U ? result.gender + 1U : 0U;
        if (request.genderFilter != 0 && request.genderFilter != packedGender) return false;
        if (request.abilityFilter != 0 && request.abilityFilter != result.ability + 1U) return false;
        if (request.natureMask != 0 && (request.natureMask & (1U << result.nature)) == 0) return false;
        if (request.hiddenPowerMask != 0 && (request.hiddenPowerMask & (1U << result.hiddenPower)) == 0) return false;
        if (request.slotMask != 0 && (request.slotMask & (1U << (result.slot - 1U))) == 0) return false;
        for (int index = 0; index < 6; index++)
            if (result.ivs[index] < request.ivMin[index] || result.ivs[index] > request.ivMax[index]) return false;
        return true;
    }

    Gen7WildTimeFinderPackedResult pack(const GeneratedResult &result, std::uint32_t frame)
    {
        std::uint32_t ivs = 0;
        for (int index = 0; index < 6; index++) ivs |= result.ivs[index] << (index * 5);
        const auto gender = result.gender < 2U ? result.gender + 1U : 0U;
        const auto metadata = result.nature | ((result.ability + 1U) << 5U) | (gender << 7U) |
                              (result.hiddenPower << 9U) | ((result.shiny == 1U) << 13U) | ((result.shiny == 2U) << 14U);
        return { frame, result.ec, result.pid, ivs, metadata, result.slot };
    }

    bool flag(std::uint32_t value) { return value <= 1; }

    bool validRequest(const Gen7WildTimeFinderPackedRequest &request)
    {
        if (request.minFrame < 1 || request.minFrame > request.maxFrame || request.maxFrame > browserMaximumFrame ||
            request.encounterType > 1 || !flag(request.useSynchronize) || request.synchronizeNature > 24 ||
            request.genderRatio != 255 && request.genderRatio != 127 && request.genderRatio != 191 &&
                request.genderRatio != 63 && request.genderRatio != 31 && request.genderRatio != 0 && request.genderRatio != 254 ||
            request.tid > 65535 || request.sid > 65535 || !flag(request.shinyCharm) || !flag(request.filtersDisabled) ||
            request.shinyFilter > 2 || request.genderFilter > 2 || request.abilityFilter > 3 || request.natureMask > allNatures ||
            request.hiddenPowerMask > 0xffff || request.slotMask > 0x3ff || request.resultLimit == 0 || request.resultLimit > maximumResults)
            return false;
        for (int index = 0; index < 6; index++)
            if (request.ivMin[index] > 31 || request.ivMax[index] > 31 || request.ivMin[index] > request.ivMax[index]) return false;
        return true;
    }

    class Session
    {
      public:
        explicit Session(const Gen7WildTimeFinderPackedRequest &request)
            : request(request), rng(request.seed, request.minFrame), currentFrame(request.minFrame)
        {
        }
        std::uint32_t step(std::uint32_t maximumStates)
        {
            results.clear();
            stepProcessed = 0;
            while (stepProcessed < maximumStates && !done())
            {
                const auto result = generate(rng, request);
                const auto accepted = matches(request, result);
                if (accepted) results.push_back(pack(result, currentFrame));
                rng.advanceState();
                currentFrame++;
                stepProcessed++;
                totalProcessed++;
                totalResults += accepted ? 1U : 0U;
                if (totalResults >= request.resultLimit) resultLimitReached = currentFrame <= request.maxFrame;
            }
            return static_cast<std::uint32_t>(results.size());
        }
        bool done() const { return currentFrame > request.maxFrame || totalResults >= request.resultLimit; }
        Gen7WildTimeFinderPackedRequest request;
        RNGList rng;
        std::uint32_t currentFrame;
        std::uint32_t stepProcessed = 0, totalProcessed = 0, totalResults = 0;
        bool resultLimitReached = false;
        std::vector<Gen7WildTimeFinderPackedResult> results;
    };

    std::unique_ptr<Session> session;
    std::uint32_t lastError = None;
}

static_assert(sizeof(Gen7WildTimeFinderPackedRequest) == 30 * sizeof(std::uint32_t));
static_assert(sizeof(Gen7WildTimeFinderPackedResult) == 6 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wildtimefinder_api_version() { return apiVersion; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wildtimefinder_begin(const Gen7WildTimeFinderPackedRequest *request)
    {
        session.reset();
        lastError = None;
        if (request == nullptr || !validRequest(*request)) { lastError = InvalidInput; return 0; }
        session = std::make_unique<Session>(*request);
        return 1;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wildtimefinder_step(std::uint32_t maximumStates)
    {
        lastError = None;
        if (!session) { lastError = SessionMissing; return 0; }
        if (maximumStates == 0 || maximumStates > maximumStepStates) { lastError = InvalidStep; return 0; }
        return session->step(maximumStates);
    }
    POKERNGKIT_KEEPALIVE std::uintptr_t gen7wildtimefinder_result_ptr() { return session ? reinterpret_cast<std::uintptr_t>(session->results.data()) : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wildtimefinder_result_count() { return session ? static_cast<std::uint32_t>(session->results.size()) : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wildtimefinder_step_processed() { return session ? session->stepProcessed : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wildtimefinder_total_processed() { return session ? session->totalProcessed : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wildtimefinder_total_results() { return session ? session->totalResults : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wildtimefinder_done() { return session && session->done() ? 1 : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wildtimefinder_limit_reached() { return session && session->resultLimitReached ? 1 : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wildtimefinder_last_error() { return lastError; }
}

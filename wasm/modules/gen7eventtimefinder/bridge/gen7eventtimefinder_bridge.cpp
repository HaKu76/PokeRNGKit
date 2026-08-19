/*
 * PokeRNGKit Gen VII Event Time Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Event search behavior is adapted from 3DSTimeFinder by Admiral-Fish
 * (GPL-3.0-or-later), including its SFMT and EventResult rules.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7eventtimefinder_bridge.h"

#include "../../gen7common/gen7_rng.hpp"

#include <algorithm>
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

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        SessionMissing = 2,
        InvalidStep = 3,
    };

    class RNGList
    {
      public:
        explicit RNGList(std::uint32_t seed, std::uint32_t frame) : rng(seed)
        {
            rng.advance(frame);
            for (auto &value : values) value = rng.nextUlong();
        }

        std::uint64_t getValue()
        {
            pointer &= 63U;
            return values[pointer++];
        }

        void advanceState()
        {
            head &= 63U;
            values[head++] = rng.nextUlong();
            pointer = head;
        }

      private:
        SFMT rng;
        std::array<std::uint64_t, 64> values{};
        std::uint32_t head = 0;
        std::uint32_t pointer = 0;
    };

    struct GeneratedResult
    {
        std::uint32_t ec = 0;
        std::uint32_t pid = 0;
        std::array<int, 6> ivs{};
        std::uint32_t nature = 0;
        std::uint32_t ability = 0;
        std::uint32_t gender = 0;
        std::uint32_t hiddenPower = 0;
        std::uint32_t shiny = 0;
    };

    std::uint32_t psv(std::uint32_t pid) { return (pid >> 16) ^ (pid & 0xffffU); }

    void setPid(GeneratedResult &result, std::uint32_t pid, std::uint32_t tsv)
    {
        result.pid = pid;
        const auto value = psv(pid);
        result.shiny = value == tsv ? 2U : ((value ^ tsv) < 16U ? 1U : 0U);
    }

    std::uint32_t hiddenPower(const std::array<int, 6> &ivs)
    {
        constexpr std::array<int, 6> order = { 0, 1, 2, 5, 3, 4 };
        int value = 0;
        for (int i = 0; i < 6; i++) value += (ivs[order[i]] & 1) << i;
        return static_cast<std::uint32_t>(value * 15 / 63);
    }

    GeneratedResult generate(RNGList &rng, const Gen7EventTimeFinderPackedRequest &request,
                             std::uint16_t eventTid, std::uint16_t eventSid)
    {
        GeneratedResult result;
        result.ec = request.ec > 0 ? request.ec : static_cast<std::uint32_t>(rng.getValue());
        const auto eventTsv = static_cast<std::uint32_t>(eventTid ^ eventSid);
        switch (request.pidType)
        {
            case 0:
                setPid(result, static_cast<std::uint32_t>(rng.getValue()), eventTsv);
                break;
            case 1:
                setPid(result, static_cast<std::uint32_t>(rng.getValue()), eventTsv);
                if (result.shiny != 0) setPid(result, result.pid ^ 0x10000000U, eventTsv);
                break;
            case 2:
            {
                auto pid = static_cast<std::uint32_t>(rng.getValue());
                if (request.otherInfo != 0)
                {
                    const auto low = pid & 0xffffU;
                    pid = (static_cast<std::uint32_t>(request.tid ^ request.sid ^ low) << 16) | low;
                }
                setPid(result, pid, eventTsv);
                break;
            }
            case 3:
                setPid(result, request.pid, eventTsv);
                break;
            default:
                break;
        }

        for (int i = 0; i < 6; i++) result.ivs[i] = request.fixedIvs[i];
        for (std::uint32_t perfect = 0; perfect < request.randomPerfectIvCount;)
        {
            const auto index = static_cast<std::size_t>(rng.getValue() % 6);
            if (result.ivs[index] == -1)
            {
                result.ivs[index] = 31;
                perfect++;
            }
        }
        for (auto &iv : result.ivs)
        {
            if (iv == -1) iv = static_cast<int>(rng.getValue() & 0x1fU);
        }
        result.hiddenPower = hiddenPower(result.ivs);
        result.ability = request.abilityLocked != 0
                             ? request.ability
                             : request.ability == 0 ? static_cast<std::uint32_t>(rng.getValue() & 1U)
                                                     : static_cast<std::uint32_t>(rng.getValue() % 3U);
        result.nature = request.natureLocked != 0 ? request.nature : static_cast<std::uint32_t>(rng.getValue() % 25U);
        result.gender = request.genderLocked != 0
                            ? request.gender
                            : static_cast<std::uint32_t>((rng.getValue() % 252U) < request.gender ? 1U : 0U);
        return result;
    }

    bool matches(const Gen7EventTimeFinderPackedRequest &request, const GeneratedResult &result)
    {
        if (request.filtersDisabled != 0) return true;
        if (request.shinyFilter == 1 && result.shiny == 0) return false;
        if (request.shinyFilter == 2 && result.shiny != 2) return false;
        if (request.genderFilter != 0 && request.genderFilter != result.gender + 1) return false;
        if (request.abilityFilter != 0 && request.abilityFilter != result.ability + 1) return false;
        if (request.natureMask != 0 && (request.natureMask & (1U << result.nature)) == 0) return false;
        if (request.hiddenPowerMask != 0 && (request.hiddenPowerMask & (1U << result.hiddenPower)) == 0) return false;
        for (int i = 0; i < 6; i++)
        {
            if (result.ivs[i] < static_cast<int>(request.ivMin[i]) || result.ivs[i] > static_cast<int>(request.ivMax[i]))
                return false;
        }
        return true;
    }

    Gen7EventTimeFinderPackedResult pack(const GeneratedResult &result, std::uint32_t frame)
    {
        std::uint32_t ivs = 0;
        for (int i = 0; i < 6; i++) ivs |= static_cast<std::uint32_t>(result.ivs[i]) << (i * 5);
        const auto packedGender = result.gender < 2U ? result.gender + 1U : 0U;
        const auto metadata = result.nature | ((result.ability + 1U) << 5) | (packedGender << 7) |
                              (result.hiddenPower << 9) | ((result.shiny == 1U) << 13) | ((result.shiny == 2U) << 14);
        return { frame, result.ec, result.pid, ivs, metadata };
    }

    bool flag(std::uint32_t value) { return value <= 1; }

    bool validRequest(const Gen7EventTimeFinderPackedRequest &request)
    {
        if (request.version > 3 || request.minFrame < 1 || request.minFrame > request.maxFrame ||
            request.maxFrame > browserMaximumFrame || request.tid > 65535 || request.sid > 65535 ||
            request.profileTid > 65535 || request.profileSid > 65535 || !flag(request.ownId) ||
            !flag(request.otherInfo) ||
            request.pidType > 3 || request.ec > 0xffffffffU || request.pid > 0xffffffffU ||
            request.randomPerfectIvCount > 6 || !flag(request.abilityLocked) ||
            request.ability > (request.abilityLocked != 0 ? 2U : 1U) ||
            !flag(request.natureLocked) || request.nature > 24 || !flag(request.genderLocked) || request.gender > 2 ||
            !flag(request.filtersDisabled) || request.shinyFilter > 2 || request.genderFilter > 2 ||
            request.abilityFilter > 3 || request.natureMask > allNatures || request.hiddenPowerMask > 0xffff ||
            request.resultLimit == 0 || request.resultLimit > maximumResults)
            return false;
        int freeIvs = 0;
        for (int i = 0; i < 6; i++)
        {
            if (request.fixedIvs[i] < -1 || request.fixedIvs[i] > 31 || request.ivMin[i] > 31 ||
                request.ivMax[i] > 31 || request.ivMin[i] > request.ivMax[i])
                return false;
            if (request.fixedIvs[i] == -1) freeIvs++;
        }
        return request.randomPerfectIvCount <= static_cast<std::uint32_t>(freeIvs);
    }

    class Session
    {
      public:
        explicit Session(const Gen7EventTimeFinderPackedRequest &request)
            : request(request), rng(request.seed, request.minFrame), currentFrame(request.minFrame)
        {
        }

        std::uint32_t step(std::uint32_t maximumStates)
        {
            results.clear();
            stepProcessed = 0;
            const auto eventTid = static_cast<std::uint16_t>(request.ownId != 0 ? request.profileTid : request.tid);
            const auto eventSid = static_cast<std::uint16_t>(request.ownId != 0 ? request.profileSid : request.sid);
            while (stepProcessed < maximumStates && !done())
            {
                const auto result = generate(rng, request, eventTid, eventSid);
                const auto accepted = matches(request, result);
                if (accepted) results.push_back(pack(result, currentFrame));
                rng.advanceState();
                currentFrame++;
                stepProcessed++;
                totalProcessed++;
                totalResults += accepted ? 1U : 0U;
                if (totalResults >= request.resultLimit)
                {
                    resultLimitReached = currentFrame <= request.maxFrame;
                    break;
                }
            }
            return static_cast<std::uint32_t>(results.size());
        }

        bool done() const { return currentFrame > request.maxFrame || totalResults >= request.resultLimit; }

        Gen7EventTimeFinderPackedRequest request;
        RNGList rng;
        std::uint32_t currentFrame;
        std::uint32_t stepProcessed = 0;
        std::uint32_t totalProcessed = 0;
        std::uint32_t totalResults = 0;
        bool resultLimitReached = false;
        std::vector<Gen7EventTimeFinderPackedResult> results;
    };

    std::unique_ptr<Session> session;
    std::uint32_t lastError = None;
}

static_assert(sizeof(Gen7EventTimeFinderPackedRequest) == 45 * sizeof(std::uint32_t));
static_assert(sizeof(Gen7EventTimeFinderPackedResult) == 5 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eventtimefinder_api_version() { return apiVersion; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eventtimefinder_begin(const Gen7EventTimeFinderPackedRequest *request)
    {
        session.reset();
        lastError = None;
        if (request == nullptr || !validRequest(*request))
        {
            lastError = InvalidInput;
            return 0;
        }
        session = std::make_unique<Session>(*request);
        return 1;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eventtimefinder_step(std::uint32_t maximumStates)
    {
        lastError = None;
        if (!session)
        {
            lastError = SessionMissing;
            return 0;
        }
        if (maximumStates == 0 || maximumStates > maximumStepStates)
        {
            lastError = InvalidStep;
            return 0;
        }
        return session->step(maximumStates);
    }
    POKERNGKIT_KEEPALIVE std::uintptr_t gen7eventtimefinder_result_ptr()
    {
        return session ? reinterpret_cast<std::uintptr_t>(session->results.data()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eventtimefinder_result_count()
    {
        return session ? static_cast<std::uint32_t>(session->results.size()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eventtimefinder_step_processed() { return session ? session->stepProcessed : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eventtimefinder_total_processed() { return session ? session->totalProcessed : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eventtimefinder_total_results() { return session ? session->totalResults : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eventtimefinder_done() { return session && session->done() ? 1 : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eventtimefinder_limit_reached()
    {
        return session && session->resultLimitReached ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eventtimefinder_last_error() { return lastError; }
}

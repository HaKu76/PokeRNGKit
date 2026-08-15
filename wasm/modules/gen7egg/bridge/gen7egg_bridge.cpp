/*
 * PokeRNGKit Gen VII Egg WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Egg behavior is adapted from 3DSRNGTool by wwwwwzx (MIT).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7egg_bridge.h"

#include "../../gen7common/gen7_rng.hpp"

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <memory>
#include <utility>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

namespace
{
    using pokerngkit::gen7::TinyMT;

    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint32_t maximumStepStates = 65'536;
    constexpr std::uint32_t maximumFrame = 1'000'000'000;
    constexpr std::uint32_t maximumShortestPathFrame = 5'000'000;
    constexpr std::uint32_t maximumResults = 100'000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        SessionMissing = 2,
        InvalidStep = 3,
    };

    enum Mode : std::uint32_t
    {
        FrameRange = 0,
        EggList = 1,
        ShortestPath = 2,
    };

    struct EggResult
    {
        std::array<std::uint32_t, 4> state {};
        std::array<std::uint32_t, 4> afterState {};
        std::array<int, 6> ivs {};
        std::array<std::int8_t, 6> inheritance {};
        std::uint32_t random = 0;
        std::uint32_t ec = 0;
        std::uint32_t pid = 0;
        std::uint32_t nature = 0;
        std::uint32_t ability = 0;
        std::uint32_t gender = 0;
        std::uint32_t hiddenPower = 0;
        std::uint32_t shiny = 0;
        std::uint32_t squareShiny = 0;
        std::uint32_t ball = 0;
        std::uint32_t natureParent = 0;
        std::uint32_t framesUsed = 0;
    };

    class EggStream
    {
      public:
        explicit EggStream(const std::array<std::uint32_t, 4> &status) : rng(status)
        {
            auto preview = rng;
            firstRandom = preview.nextUint();
        }

        std::uint32_t next()
        {
            used++;
            return rng.nextUint();
        }

        void advance(std::uint32_t count)
        {
            used += count;
            rng.advance(count);
        }

        std::uint32_t initialRandom() const { return firstRandom; }
        std::uint32_t framesUsed() const { return used; }
        const std::array<std::uint32_t, 4> &status() const { return rng.status(); }

      private:
        TinyMT rng;
        std::uint32_t firstRandom = 0;
        std::uint32_t used = 0;
    };

    std::uint32_t randomAbility(std::uint32_t inheritedAbility, std::uint32_t value)
    {
        switch (inheritedAbility)
        {
        case 0:
            return value < 80 ? 1 : 2;
        case 1:
            return value < 20 ? 1 : 2;
        case 2:
            if (value < 20) return 1;
            if (value < 40) return 2;
            return 3;
        default:
            return 0;
        }
    }

    bool otherTsvContains(const Gen7EggPackedRequest &request, std::uint32_t tsv)
    {
        return (request.otherTsvMask[tsv >> 5] & (1U << (tsv & 31U))) != 0;
    }

    EggResult generateEgg(const Gen7EggPackedRequest &request,
                          const std::array<std::uint32_t, 4> &state)
    {
        EggResult egg;
        egg.state = state;
        EggStream stream(state);
        egg.random = stream.initialRandom();

        if (request.nidoType != 0)
            egg.gender = (stream.next() & 1U) + 1U;
        else if (request.genderRatio > 15)
            egg.gender = stream.next() % 252 >= request.genderRatio ? 1U : 2U;
        else
            egg.gender = request.genderRatio;

        egg.nature = stream.next() % 25;

        const bool maleEverstone = request.maleItem == 1;
        const bool femaleEverstone = request.femaleItem == 1;
        if (maleEverstone && femaleEverstone)
        {
            egg.natureParent = (stream.next() & 1U) == 0 ? 1U : 2U;
        }
        else if (maleEverstone || femaleEverstone)
        {
            egg.natureParent = maleEverstone ? 1U : 2U;
        }

        const auto inheritedAbility = request.femaleIsDitto != 0 ? request.maleAbility : request.femaleAbility;
        egg.ability = randomAbility(inheritedAbility, stream.next() % 100);

        const bool malePower = request.maleItem > 2;
        const bool femalePower = request.femaleItem > 2;
        const bool power = malePower || femalePower;
        if (malePower && femalePower)
        {
            if ((stream.next() & 1U) == 0)
                egg.inheritance[request.maleItem - 3] = 1;
            else
                egg.inheritance[request.femaleItem - 3] = -1;
        }
        else if (power)
        {
            if (malePower)
                egg.inheritance[request.maleItem - 3] = 1;
            else
                egg.inheritance[request.femaleItem - 3] = -1;
        }

        const bool destinyKnot = request.maleItem == 2 || request.femaleItem == 2;
        const int inheritedCount = destinyKnot ? 5 : 3;
        for (int i = power ? 1 : 0; i < inheritedCount; i++)
        {
            int slot;
            do
            {
                slot = static_cast<int>(stream.next() % 6);
            } while (egg.inheritance[slot] != 0);
            egg.inheritance[slot] = (stream.next() & 1U) == 0 ? 1 : -1;
        }

        for (int i = 0; i < 6; i++)
        {
            egg.ivs[i] = static_cast<int>(stream.next() & 0x1fU);
            if (egg.inheritance[i] > 0) egg.ivs[i] = static_cast<int>(request.maleIvs[i]);
            if (egg.inheritance[i] < 0) egg.ivs[i] = static_cast<int>(request.femaleIvs[i]);
        }

        egg.ec = stream.next();
        const std::uint32_t rerolls = (request.shinyCharm != 0 ? 2U : 0U) +
                                      (request.masudaMethod != 0 ? 6U : 0U);
        for (std::uint32_t i = 0; i < rerolls; i++)
        {
            egg.pid = stream.next();
            if (pokerngkit::gen7::psv(egg.pid) == request.tsv)
            {
                egg.shiny = 1;
                egg.squareShiny = pokerngkit::gen7::prv(egg.pid) == request.trv ? 1U : 0U;
                break;
            }
        }
        const bool considerOther = request.considerOtherTsv != 0 && rerolls != 0;
        if (considerOther && otherTsvContains(request, pokerngkit::gen7::psv(egg.pid))) egg.shiny = 1;

        if (request.homogeneous != 0)
            egg.ball = stream.next() % 100 >= 50 ? 1U : 2U;
        else
            egg.ball = request.femaleIsDitto != 0 ? 1U : 2U;

        stream.advance(2);
        egg.framesUsed = stream.framesUsed();
        egg.afterState = stream.status();
        egg.hiddenPower = pokerngkit::gen7::hiddenPower(egg.ivs);
        return egg;
    }

    std::uint32_t bitCountPerfect(const EggResult &egg, std::uint32_t threshold)
    {
        return static_cast<std::uint32_t>(
            std::count_if(egg.ivs.begin(), egg.ivs.end(),
                          [threshold](int iv) { return iv >= static_cast<int>(threshold); }));
    }

    bool matchesFilters(const Gen7EggPackedRequest &request, const EggResult &egg)
    {
        if (request.filtersDisabled != 0) return true;
        if (request.ballFilter != 0 && request.ballFilter != egg.ball) return false;
        if (request.natureInheritanceFilter != 0 &&
            request.natureInheritanceFilter != egg.natureParent)
            return false;
        if (request.shinyOnly != 0 && egg.shiny == 0) return false;
        if (request.squareShinyOnly != 0 && egg.squareShiny == 0) return false;
        for (int i = 0; i < 6; i++)
        {
            if (egg.ivs[i] < static_cast<int>(request.ivMin[i]) ||
                egg.ivs[i] > static_cast<int>(request.ivMax[i]))
                return false;
        }
        if (bitCountPerfect(egg, request.perfectIvValue) < request.perfectIvCount) return false;
        if (request.hiddenPowerMask != 0 &&
            (request.hiddenPowerMask & (1U << egg.hiddenPower)) == 0)
            return false;
        if (request.natureMask != 0 && (request.natureMask & (1U << egg.nature)) == 0) return false;
        if (request.genderFilter != 0 && request.genderFilter != egg.gender) return false;
        if (request.abilityFilter != 0 && request.abilityFilter != egg.ability) return false;
        return true;
    }

    bool matchesShinyReminder(const Gen7EggPackedRequest &request, const EggResult &egg)
    {
        if (request.shinyReminder == 0) return false;
        const auto value = pokerngkit::gen7::psv(egg.random);
        return value == request.tsv || (request.considerOtherTsv != 0 && otherTsvContains(request, value));
    }

    std::uint32_t packIvs(const std::array<int, 6> &ivs)
    {
        std::uint32_t packed = 0;
        for (int i = 0; i < 6; i++) packed |= static_cast<std::uint32_t>(ivs[i]) << (i * 5);
        return packed;
    }

    Gen7EggPackedResult packResult(const EggResult &egg, std::uint32_t frame,
                                   std::uint32_t eggNumber, std::uint32_t action)
    {
        Gen7EggPackedResult packed {};
        packed.frame = frame;
        packed.eggNumber = eggNumber;
        std::copy(egg.state.begin(), egg.state.end(), packed.state);
        std::copy(egg.afterState.begin(), egg.afterState.end(), packed.afterState);
        packed.random = egg.random;
        packed.ec = egg.ec;
        packed.pid = egg.pid;
        packed.ivs = packIvs(egg.ivs);
        packed.metadata = egg.nature | (egg.ability << 5) | (egg.gender << 7) |
                          (egg.hiddenPower << 9) | (egg.shiny << 13) |
                          (egg.squareShiny << 14) | (egg.ball << 15) |
                          (egg.natureParent << 17) | (action << 19);
        packed.framesUsed = egg.framesUsed;
        for (int i = 0; i < 6; i++)
        {
            if (egg.inheritance[i] > 0) packed.inheritedMaleMask |= 1U << i;
            if (egg.inheritance[i] < 0) packed.inheritedFemaleMask |= 1U << i;
        }
        packed.psv = pokerngkit::gen7::psv(egg.pid);
        packed.prv = pokerngkit::gen7::prv(egg.pid);
        return packed;
    }

    bool flag(std::uint32_t value) { return value <= 1; }

    bool validGenderRatio(std::uint32_t value)
    {
        return value == 0 || value == 1 || value == 2 || value == 30 || value == 62 ||
               value == 126 || value == 190 || value == 224;
    }

    bool validRequest(const Gen7EggPackedRequest &request)
    {
        if (request.mode > ShortestPath || request.resultLimit == 0 ||
            request.resultLimit > maximumResults || request.tsv > 4095 || request.trv > 15 ||
            request.maleItem > 8 || request.femaleItem > 8 || request.maleAbility > 2 ||
            request.femaleAbility > 2 || !validGenderRatio(request.genderRatio))
            return false;
        if (!flag(request.shinyCharm) || !flag(request.masudaMethod) || !flag(request.nidoType) ||
            !flag(request.homogeneous) || !flag(request.maleIsDitto) ||
            !flag(request.femaleIsDitto) || !flag(request.considerOtherTsv) ||
            !flag(request.shinyReminder) || !flag(request.filtersDisabled) ||
            !flag(request.shinyOnly) || !flag(request.squareShinyOnly))
            return false;
        if (request.maleIsDitto != 0 && request.femaleIsDitto != 0) return false;
        if ((request.genderRatio == 0 || request.genderRatio == 1) &&
            (request.femaleIsDitto == 0 || request.maleIsDitto != 0))
            return false;
        if (request.genderRatio == 2 && request.femaleIsDitto != 0) return false;
        if (request.nidoType != 0 && request.genderRatio != 126) return false;
        if (request.homogeneous != 0 &&
            (request.nidoType != 0 || request.maleIsDitto != 0 || request.femaleIsDitto != 0 ||
             request.genderRatio == 2))
            return false;
        if (request.mode == FrameRange)
        {
            if (request.rangeStart > request.rangeEnd || request.rangeEnd > maximumFrame) return false;
        }
        else if (request.mode == EggList)
        {
            if (request.rangeStart < 1 || request.rangeStart > request.rangeEnd || request.rangeEnd > 10'000 ||
                request.targetFrame > maximumFrame)
                return false;
        }
        else if (request.targetFrame > maximumShortestPathFrame)
        {
            return false;
        }
        const bool hasPidRerolls = request.shinyCharm != 0 || request.masudaMethod != 0;
        if (request.considerOtherTsv != 0 && !hasPidRerolls) return false;
        if (request.shinyReminder != 0 && (request.mode != FrameRange || !hasPidRerolls)) return false;
        if (request.genderFilter > 2 || request.abilityFilter > 3 ||
            request.natureMask > 0x1ffffffU || request.hiddenPowerMask > 0xffffU ||
            request.perfectIvValue > 31 || request.perfectIvCount > 6 || request.ballFilter > 2 ||
            request.natureInheritanceFilter > 2)
            return false;
        if (request.considerOtherTsv != 0 && request.shinyOnly == 0) return false;
        const bool hasEverstone = request.maleItem == 1 || request.femaleItem == 1;
        if (!hasEverstone && request.natureInheritanceFilter != 0) return false;
        if (hasEverstone && request.natureMask != 0 && request.natureMask != 0x1ffffffU)
            return false;
        for (int i = 0; i < 6; i++)
        {
            if (request.maleIvs[i] > 31 || request.femaleIvs[i] > 31 || request.ivMin[i] > 31 ||
                request.ivMax[i] > 31 || request.ivMin[i] > request.ivMax[i])
                return false;
        }
        return true;
    }

    class Session
    {
      public:
        explicit Session(const Gen7EggPackedRequest &request)
            : request(request), base(std::array<std::uint32_t, 4> {
                                    request.status[0], request.status[1], request.status[2], request.status[3] })
        {
            if (request.mode == FrameRange)
            {
                base.advance(request.rangeStart);
                currentIndex = request.rangeStart;
                taskCount = request.rangeEnd - request.rangeStart + 1;
            }
            else if (request.mode == EggList)
            {
                base.advance(request.rangeStart - 1);
                taskCount = request.rangeEnd;
            }
            else
            {
                taskCount = request.targetFrame + 1;
                pathPrevious.resize(static_cast<std::size_t>(taskCount));
                pathWeight.resize(static_cast<std::size_t>(taskCount),
                                  std::numeric_limits<std::uint32_t>::max());
                pathWeight[0] = 0;
            }
        }

        std::uint32_t step(std::uint32_t maximumStates)
        {
            results.clear();
            stepProcessed = 0;
            if (request.mode == ShortestPath)
                stepShortest(maximumStates);
            else
                stepGenerate(maximumStates);
            return static_cast<std::uint32_t>(results.size());
        }

        bool done() const
        {
            if (request.mode == ShortestPath)
                return resultLimitReached || (pathReady && emittedPath >= path.size());
            return totalProcessed >= taskCount || totalResults >= request.resultLimit;
        }

        Gen7EggPackedRequest request;
        std::vector<Gen7EggPackedResult> results;
        std::uint32_t taskCount = 0;
        std::uint32_t stepProcessed = 0;
        std::uint32_t totalProcessed = 0;
        std::uint32_t totalResults = 0;
        bool resultLimitReached = false;
        bool targetFound = false;
        std::uint32_t summaryAccepts = 0;
        std::uint32_t summaryRejects = 0;

      private:
        TinyMT base;
        std::uint32_t currentIndex = 0;
        std::uint32_t cumulativeFrame = 0;
        std::vector<std::uint32_t> pathPrevious;
        std::vector<std::uint32_t> pathWeight;
        std::vector<std::uint32_t> path;
        std::size_t emittedPath = 0;
        bool pathReady = false;

        void stepGenerate(std::uint32_t maximumStates)
        {
            while (stepProcessed < maximumStates && totalProcessed < taskCount &&
                   totalResults < request.resultLimit)
            {
                const auto egg = generateEgg(request, base.status());
                if (request.mode == FrameRange)
                {
                    if (matchesFilters(request, egg) || matchesShinyReminder(request, egg))
                    {
                        results.push_back(packResult(egg, currentIndex, 0, 0));
                        totalResults++;
                    }
                    base.nextState();
                    currentIndex++;
                }
                else
                {
                    const auto eggIndex = totalProcessed;
                    if (!targetFound && cumulativeFrame <= request.targetFrame &&
                        request.targetFrame < cumulativeFrame + egg.framesUsed)
                    {
                        targetFound = true;
                        summaryAccepts = eggIndex;
                        summaryRejects = request.targetFrame - cumulativeFrame;
                    }
                    if (eggIndex >= request.rangeStart - 1 && matchesFilters(request, egg))
                    {
                        results.push_back(packResult(egg, cumulativeFrame, eggIndex + 1, 0));
                        totalResults++;
                    }
                    cumulativeFrame += egg.framesUsed;
                    base.advance(egg.framesUsed);
                }
                stepProcessed++;
                totalProcessed++;
            }
            if (totalResults >= request.resultLimit && totalProcessed < taskCount) resultLimitReached = true;
        }

        void finalizePath()
        {
            const auto maximum = request.targetFrame;
            for (auto node = maximum;; node = pathPrevious[node])
            {
                path.push_back(node);
                if (node == 0) break;
            }
            std::reverse(path.begin(), path.end());
            for (std::size_t i = 0; i + 1 < path.size(); i++)
            {
                if (path[i + 1] == path[i] + 1)
                    summaryRejects++;
                else
                    summaryAccepts++;
            }
            std::vector<std::uint32_t>().swap(pathPrevious);
            std::vector<std::uint32_t>().swap(pathWeight);
            targetFound = true;
            pathReady = true;
        }

        void emitPath(std::uint32_t maximumStates)
        {
            if (emittedPath >= path.size()) return;
            TinyMT replay(std::array<std::uint32_t, 4> {
                request.status[0], request.status[1], request.status[2], request.status[3] });
            const auto startFrame = path[emittedPath];
            replay.advance(startFrame);
            auto frame = startFrame;
            while (emittedPath < path.size() && results.size() < maximumStates &&
                   totalResults < request.resultLimit)
            {
                const auto target = path[emittedPath];
                replay.advance(target - frame);
                frame = target;
                const auto egg = generateEgg(request, replay.status());
                const auto action = emittedPath + 1 == path.size() ||
                                            path[emittedPath + 1] - target > 1
                                        ? 1U
                                        : 2U;
                results.push_back(packResult(egg, target,
                                             static_cast<std::uint32_t>(emittedPath + 1), action));
                emittedPath++;
                totalResults++;
            }
            if (totalResults >= request.resultLimit && emittedPath < path.size()) resultLimitReached = true;
        }

        void stepShortest(std::uint32_t maximumStates)
        {
            if (!pathReady)
            {
                while (stepProcessed < maximumStates && totalProcessed < taskCount)
                {
                    const auto index = totalProcessed;
                    if (index != 0 && pathWeight[index] > pathWeight[index - 1] + 1)
                    {
                        pathPrevious[index] = index - 1;
                        pathWeight[index] = pathWeight[index - 1] + 1;
                    }
                    const auto egg = generateEgg(request, base.status());
                    if (egg.framesUsed <= request.targetFrame - index)
                    {
                        const auto next = index + egg.framesUsed;
                        if (pathWeight[next] > pathWeight[index] + 1)
                        {
                            pathPrevious[next] = index;
                            pathWeight[next] = pathWeight[index] + 1;
                        }
                    }
                    base.nextState();
                    stepProcessed++;
                    totalProcessed++;
                }
                if (totalProcessed == taskCount) finalizePath();
            }
            if (pathReady) emitPath(maximumStates);
        }
    };

    std::unique_ptr<Session> session;
    std::uint32_t lastError = None;
}

static_assert(sizeof(Gen7EggPackedRequest) == 187 * sizeof(std::uint32_t));
static_assert(sizeof(Gen7EggPackedResult) == 20 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_begin(const Gen7EggPackedRequest *request)
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

    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_step(std::uint32_t maximumStates)
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

    POKERNGKIT_KEEPALIVE std::uintptr_t gen7egg_result_ptr()
    {
        return session ? reinterpret_cast<std::uintptr_t>(session->results.data()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_result_count()
    {
        return session ? static_cast<std::uint32_t>(session->results.size()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_step_processed()
    {
        return session ? session->stepProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_total_processed()
    {
        return session ? session->totalProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_total_results()
    {
        return session ? session->totalResults : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_done() { return session && session->done() ? 1 : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_limit_reached()
    {
        return session && session->resultLimitReached ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_target_found()
    {
        return session && session->targetFound ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_summary_accepts()
    {
        return session ? session->summaryAccepts : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_summary_rejects()
    {
        return session ? session->summaryRejects : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7egg_last_error() { return lastError; }
}

/*
 * PokeRNGKit Gen VII Event WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Event behavior is adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including its SFMT implementation by Rei HOBARA.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7event_bridge.h"

#include "../../gen7common/gen7_rng.hpp"

#include <algorithm>
#include <array>
#include <cstdint>
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
    using pokerngkit::gen7::Lookahead;
    using pokerngkit::gen7::ModelSnapshot;
    using pokerngkit::gen7::ModelStatus;
    using pokerngkit::gen7::SFMT;

    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint32_t browserMaximumFrame = 5000000;
    constexpr std::uint32_t maximumResults = 100000;
    constexpr std::uint32_t maximumStepStates = 65536;
    constexpr std::uint32_t allNatures = 0x1ffffff;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        SessionMissing = 2,
        InvalidStep = 3,
    };

    struct GeneratedResult
    {
        std::uint64_t random = 0;
        std::uint32_t ec = 0;
        std::uint32_t pid = 0;
        std::array<int, 6> ivs {};
        std::uint32_t nature = 0;
        std::uint32_t ability = 0;
        std::uint32_t gender = 0;
        std::uint32_t hiddenPower = 0;
        bool shiny = false;
        bool square = false;
        std::uint32_t delay = 0;
    };

    class GenerationContext
    {
      public:
        GenerationContext(Lookahead &stream, const Gen7EventPackedRequest &request,
                          const ModelSnapshot &snapshot)
            : stream(stream), request(request), modelNumber(snapshot.modelNumber), remain(snapshot.remain)
        {
        }

        std::uint64_t current() { return stream.current(); }
        std::uint64_t next() { return stream.next(); }
        void advance(std::uint32_t count) { stream.advance(static_cast<std::int32_t>(count)); }
        std::uint32_t index() const { return stream.index(); }

        void timeElapse(int count)
        {
            for (int frame = 0; frame < count; frame++)
            {
                for (std::uint32_t i = 0; i < modelNumber; i++)
                {
                    if (remain[i] > 1)
                    {
                        remain[i]--;
                        continue;
                    }
                    if (remain[i] < 0)
                    {
                        if (++remain[i] == 0) remain[i] = next() % 3 == 0 ? 36 : 30;
                        continue;
                    }
                    if ((next() & 0x7f) == 0) remain[i] = -5;
                }
            }
        }

        void applyDelay();

      private:
        Lookahead &stream;
        const Gen7EventPackedRequest &request;
        std::uint32_t modelNumber;
        std::vector<int> remain;

        friend GeneratedResult generatePokemon(GenerationContext &, const Gen7EventPackedRequest &);
    };

    GeneratedResult generatePokemon(GenerationContext &context, const Gen7EventPackedRequest &request)
    {
        GeneratedResult result;
        result.ec = request.ec > 0 ? request.ec : static_cast<std::uint32_t>(context.next());

        switch (request.pidType)
        {
            case 0:
                result.pid = static_cast<std::uint32_t>(context.next());
                if (pokerngkit::gen7::psv(result.pid) == request.tsv)
                {
                    result.shiny = true;
                    result.square = true;
                }
                break;
            case 1:
                result.pid = static_cast<std::uint32_t>(context.next());
                if (pokerngkit::gen7::psv(result.pid) == request.tsv) result.pid ^= 0x10000000;
                break;
            case 2:
            {
                result.pid = static_cast<std::uint32_t>(context.next());
                result.shiny = true;
                result.square = true;
                if (request.otherInfo != 0)
                {
                    const auto low = result.pid & 0xffff;
                    result.pid = ((request.tid ^ request.sid ^ low) << 16) | low;
                }
                break;
            }
            case 3:
                result.pid = request.pid;
                if (pokerngkit::gen7::psv(result.pid) == request.tsv)
                {
                    result.shiny = true;
                    result.square = true;
                }
                break;
            default:
                break;
        }

        for (int i = 0; i < 6; i++) result.ivs[i] = request.fixedIvs[i];
        int perfect = static_cast<int>(request.randomPerfectIvCount);
        while (perfect > 0)
        {
            const auto index = static_cast<std::size_t>(context.next() % 6);
            if (result.ivs[index] < 0)
            {
                result.ivs[index] = 31;
                perfect--;
            }
        }
        for (int i = 0; i < 6; i++)
        {
            if (result.ivs[i] < 0) result.ivs[i] = static_cast<int>(context.next() & 0x1f);
        }

        if (request.abilityLocked != 0)
        {
            result.ability = request.ability;
        }
        else if (request.ability == 0)
        {
            result.ability = static_cast<std::uint32_t>((context.next() & 1) + 1);
        }
        else
        {
            result.ability = static_cast<std::uint32_t>(context.next() % 3 + 1);
        }

        result.nature = request.natureLocked != 0 ? request.nature
                                                   : static_cast<std::uint32_t>(context.next() % 25);
        result.gender = request.genderLocked != 0
                            ? request.gender
                            : static_cast<std::uint32_t>(context.next() % 252 >= request.genderSetting ? 1 : 2);
        result.hiddenPower = pokerngkit::gen7::hiddenPower(result.ivs);
        return result;
    }

    void GenerationContext::applyDelay()
    {
        if (request.considerDelay == 0) return;
        timeElapse(2);
        if (request.noDexEntry != 0 || (request.yourId != 0 && request.isEgg == 0))
        {
            static_cast<void>(generatePokemon(*this, request));
        }
        timeElapse(static_cast<int>(request.delay / 2));
    }

    GeneratedResult generateResult(Lookahead &stream, const Gen7EventPackedRequest &request,
                                   const ModelSnapshot &snapshot)
    {
        GenerationContext context(stream, request, snapshot);
        GeneratedResult result;
        result.random = context.current();
        context.applyDelay();
        result.delay = context.index();
        auto generated = generatePokemon(context, request);
        generated.random = result.random;
        generated.delay = result.delay;
        return generated;
    }

    bool matches(const Gen7EventPackedRequest &request, const GeneratedResult &result, std::uint8_t blink)
    {
        if (request.blinkFilter == 1 && blink < 4) return false;
        if (request.blinkFilter == 2 && blink >= 2) return false;
        if (request.filtersDisabled != 0) return true;
        if (request.shinyOnly != 0 && !result.shiny) return false;
        if (request.squareShinyOnly != 0 && !result.square) return false;
        if (request.genderFilter != 0 && request.genderFilter != result.gender) return false;
        if (request.abilityFilter != 0 && request.abilityFilter != result.ability) return false;
        if (request.natureMask != 0 && (request.natureMask & (1U << result.nature)) == 0) return false;
        if (request.hiddenPowerMask != 0 && (request.hiddenPowerMask & (1U << result.hiddenPower)) == 0)
            return false;
        int perfect = 0;
        for (int i = 0; i < 6; i++)
        {
            if (result.ivs[i] < static_cast<int>(request.ivMin[i]) ||
                result.ivs[i] > static_cast<int>(request.ivMax[i]))
                return false;
            if (result.ivs[i] >= static_cast<int>(request.perfectIvValue)) perfect++;
        }
        return perfect >= static_cast<int>(request.perfectIvCount);
    }

    Gen7EventPackedResult pack(const GeneratedResult &result, std::uint32_t frame,
                               std::uint32_t realTimeFrames, std::uint8_t blink)
    {
        std::uint32_t ivs = 0;
        for (int i = 0; i < 6; i++) ivs |= static_cast<std::uint32_t>(result.ivs[i]) << (i * 5);
        const std::uint32_t metadata = result.nature | result.ability << 5 | result.gender << 7 |
                                       result.hiddenPower << 9 | static_cast<std::uint32_t>(result.shiny) << 13 |
                                       static_cast<std::uint32_t>(result.square) << 14 |
                                       static_cast<std::uint32_t>(blink) << 16;
        return {
            frame,
            realTimeFrames,
            static_cast<std::uint32_t>(result.random),
            static_cast<std::uint32_t>(result.random >> 32),
            result.ec,
            result.pid,
            ivs,
            metadata,
            result.delay,
        };
    }

    bool flag(std::uint32_t value) { return value <= 1; }

    bool validGenderSetting(std::uint32_t value)
    {
        constexpr std::array<std::uint32_t, 8> values = { 0, 1, 2, 30, 62, 126, 190, 224 };
        return std::find(values.begin(), values.end(), value) != values.end();
    }

    bool validRequest(const Gen7EventPackedRequest &request)
    {
        const auto startingFrame = request.version < 2 ? 418U : 478U;
        const auto maximumSpecies = request.version < 2 ? 802U : 807U;
        if (request.version > 3 || request.minFrame < startingFrame || request.maxFrame < request.minFrame ||
            request.maxFrame > browserMaximumFrame || request.tsv > 4095 || request.trv > 15 || request.npc > 100 ||
            request.delay > 4000 || !flag(request.considerDelay) || !flag(request.noDexEntry) ||
            !flag(request.yourId) || !flag(request.isEgg) || !flag(request.otherInfo) || request.pidType > 3 ||
            request.tid > 65535 || request.sid > 65535 || !flag(request.abilityLocked) ||
            request.ability > (request.abilityLocked != 0 ? 3U : 1U) || !flag(request.natureLocked) ||
            request.nature > 24 || !flag(request.genderLocked) ||
            !validGenderSetting(request.genderSetting) || request.species > maximumSpecies || request.form > 255 ||
            request.level > 100 || request.randomPerfectIvCount > 5)
            return false;
        if (request.genderLocked == 0 && (request.genderSetting <= 2 || request.gender != request.genderSetting))
            return false;
        if (request.genderLocked != 0 && request.gender > 2) return false;

        int fixedIvCount = 0;
        for (int i = 0; i < 6; i++)
        {
            if (request.fixedIvs[i] < -1 || request.fixedIvs[i] > 31 || request.ivMin[i] > 31 ||
                request.ivMax[i] > 31 || request.ivMin[i] > request.ivMax[i])
                return false;
            if (request.fixedIvs[i] >= 0) fixedIvCount++;
        }
        if (request.randomPerfectIvCount > 0 &&
            fixedIvCount + static_cast<int>(request.randomPerfectIvCount) > 5)
            return false;
        if (!flag(request.filtersDisabled) || !flag(request.shinyOnly) || !flag(request.squareShinyOnly) ||
            request.genderFilter > 2 || request.abilityFilter > 3 || request.natureMask > allNatures ||
            request.hiddenPowerMask > 0xffff || request.perfectIvValue > 31 || request.perfectIvCount > 6 ||
            request.blinkFilter > 2 || request.resultLimit == 0 || request.resultLimit > maximumResults ||
            (request.blinkFilter == 1 && request.npc != 0) || (request.blinkFilter == 2 && request.npc == 0))
            return false;
        return true;
    }

    class Session
    {
      public:
        explicit Session(const Gen7EventPackedRequest &request)
            : request(request), blinkFlags(pokerngkit::gen7::createBlinkFlags(request.seed, request.minFrame,
                                                                              request.maxFrame, request.npc)),
              stream(makeStartingRng(request.seed, request.minFrame)),
              status(request.npc + 1, makeStartingRng(request.seed, request.minFrame), false),
              generationStatus(request.npc + 1), currentFrame(request.minFrame)
        {
        }

        std::uint32_t step(std::uint32_t maximumStates)
        {
            results.clear();
            stepProcessed = 0;
            while (stepProcessed < maximumStates && !isDone())
            {
                if (frameAdvance == 0)
                {
                    do
                    {
                        frameAdvance = status.nextState();
                        realTime++;
                    } while (frameAdvance == 0);
                }

                const auto blink = blinkFlags[currentFrame - request.minFrame];
                const auto generated = generateResult(stream, request, generationStatus);
                stream.advanceBase();
                frameAdvance--;
                stepProcessed++;
                totalProcessed++;
                if (matches(request, generated, blink))
                {
                    results.push_back(pack(generated, currentFrame, frameTime * 2, blink));
                    totalResults++;
                }
                currentFrame++;

                if (frameAdvance == 0)
                {
                    generationStatus = status.copy();
                    frameTime = realTime;
                }
                if (totalResults >= request.resultLimit)
                {
                    resultLimitReached = currentFrame <= request.maxFrame;
                    break;
                }
            }
            return static_cast<std::uint32_t>(results.size());
        }

        bool isDone() const { return currentFrame > request.maxFrame || totalResults >= request.resultLimit; }

        Gen7EventPackedRequest request;
        std::vector<std::uint8_t> blinkFlags;
        Lookahead stream;
        ModelStatus status;
        ModelSnapshot generationStatus;
        std::uint32_t currentFrame;
        int frameAdvance = 0;
        std::uint32_t realTime = 0;
        std::uint32_t frameTime = 0;
        std::uint32_t stepProcessed = 0;
        std::uint32_t totalProcessed = 0;
        std::uint32_t totalResults = 0;
        bool resultLimitReached = false;
        std::vector<Gen7EventPackedResult> results;

      private:
        static SFMT makeStartingRng(std::uint32_t seed, std::uint32_t frame)
        {
            SFMT rng(seed);
            rng.advance(frame);
            return rng;
        }
    };

    std::unique_ptr<Session> session;
    std::uint32_t lastError = None;
}

static_assert(sizeof(Gen7EventPackedRequest) == 58 * sizeof(std::uint32_t));
static_assert(sizeof(Gen7EventPackedResult) == 9 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7event_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7event_begin(const Gen7EventPackedRequest *request)
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

    POKERNGKIT_KEEPALIVE std::uint32_t gen7event_step(std::uint32_t maximumStates)
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

    POKERNGKIT_KEEPALIVE std::uintptr_t gen7event_result_ptr()
    {
        return session ? reinterpret_cast<std::uintptr_t>(session->results.data()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7event_result_count()
    {
        return session ? static_cast<std::uint32_t>(session->results.size()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7event_step_processed()
    {
        return session ? session->stepProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7event_total_processed()
    {
        return session ? session->totalProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7event_total_results()
    {
        return session ? session->totalResults : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7event_done()
    {
        return session && session->isDone() ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7event_limit_reached()
    {
        return session && session->resultLimitReached ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7event_last_error() { return lastError; }
}

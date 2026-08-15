/*
 * PokeRNGKit Gen VII Wild WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Wild behavior is adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including its Wild7, WildRNG, RNGPool and Search7_Normal paths.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7wild_bridge.h"

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
    constexpr std::uint32_t browserMaximumFrame = 10000000;
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

    struct SlotInfo
    {
        std::uint32_t species = 0;
        std::uint32_t form = 0;
        std::uint32_t gender = 0;
        bool randomGender = false;
        bool fixedThreeIv = false;
        bool electric = false;
        bool steel = false;
    };

    SlotInfo slotInfo(const Gen7WildPackedRequest &request, std::uint32_t slot)
    {
        const auto value = request.species[slot];
        const auto metadata = request.slotMetadata[slot];
        return {
            value & 0x7ff,
            (value >> 11) & 0xff,
            metadata & 0xff,
            ((metadata >> 8) & 1) != 0,
            ((metadata >> 9) & 1) != 0,
            ((metadata >> 10) & 1) != 0,
            ((metadata >> 11) & 1) != 0,
        };
    }

    class GenerationContext
    {
      public:
        GenerationContext(Lookahead &stream, const Gen7WildPackedRequest &request,
                          const ModelSnapshot &snapshot)
            : stream(stream), request(request), modelNumber(snapshot.modelNumber), remain(snapshot.remain),
              phase(snapshot.phase)
        {
        }

        std::uint64_t current() { return stream.current(); }
        std::uint64_t next() { return stream.next(); }
        void advance(std::int32_t count) { stream.advance(count); }
        std::uint32_t index() const { return stream.index(); }
        void rewind(std::uint32_t value) { stream.rewind(value); }

        bool applyDelay()
        {
            if (request.considerDelay == 0)
            {
                resetModelStatus();
                return true;
            }
            switch (request.globalDelayType)
            {
                case 1:
                    timeElapse(request.delayTime);
                    return true;
                case 2:
                {
                    const auto fishingDelay = static_cast<int>(next() % 60) + static_cast<int>(request.biteDelay);
                    advance(1);
                    timeElapse(fishingDelay);
                    const bool pokemon = request.lead == 7 || next() % 100 < 50;
                    timeElapse(request.platformDelay);
                    timeElapse(request.delayTime);
                    return pokemon;
                }
                case 3:
                    advance(2);
                    timeElapse(request.delayTime);
                    if (request.wildCry != 0) advance(1);
                    return true;
                case 4:
                    timeElapse(2);
                    advance(2);
                    timeElapse(request.delayTime - 2);
                    if (request.wildCry != 0) advance(1);
                    return true;
                default:
                    timeElapse(request.delayTime);
                    resetModelStatus();
                    if (request.version >= 2) advance(1);
                    if (request.raining != 0) advance(2);
                    timeElapse(1);
                    advance(static_cast<std::int32_t>(request.preHoneyCorrection) -
                            static_cast<std::int32_t>(modelNumber));
                    timeElapse(request.honeyDelay);
                    return true;
            }
        }

        void inlineDelay()
        {
            if (request.inlineDelayTime <= 0) return;
            if (request.inlineDelayType == 1)
            {
                timeElapse(request.inlineDelayTime - 2);
                if (modelNumber > 0) modelNumber--;
                timeElapse(2);
            }
            else
            {
                timeElapse(request.inlineDelayTime);
            }
        }

        void timeElapse(int count)
        {
            if (count <= 0) return;
            for (int frame = 0; frame < count; frame++)
            {
                ensureModelStorage(modelNumber);
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
                if (request.raining != 0 && (phase = !phase)) advance(2);
            }
        }

      private:
        Lookahead &stream;
        const Gen7WildPackedRequest &request;
        std::uint32_t modelNumber;
        std::vector<int> remain;
        bool phase;

        void ensureModelStorage(std::uint32_t size)
        {
            if (remain.size() < size) remain.resize(size);
        }

        void resetModelStatus()
        {
            modelNumber = request.npc + 1;
            remain.assign(modelNumber, 0);
            phase = false;
        }
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
        std::uint32_t species = 0;
        std::uint32_t form = 0;
        std::uint32_t level = 0;
        std::uint32_t slot = 0;
        std::uint32_t item = 3;
        std::uint32_t specialValue = 0xff;
        bool shiny = false;
        bool square = false;
        bool synchronize = false;
        bool special = false;
        bool validPokemon = true;
        std::uint32_t delay = 0;
    };

    std::uint32_t cuteCharmGender(std::uint32_t lead)
    {
        if (lead == 2) return 2;
        if (lead == 3) return 1;
        return 0;
    }

    std::uint32_t chooseNormalSlot(GenerationContext &context, const Gen7WildPackedRequest &request,
                                   bool staticMagnetPass)
    {
        if (staticMagnetPass)
        {
            std::array<std::uint32_t, 10> eligible {};
            std::uint32_t count = 0;
            for (std::uint32_t slot = 1; slot <= 10 && request.species[slot] != 0; slot++)
            {
                const auto info = slotInfo(request, slot);
                if ((request.lead == 4 && info.electric) || (request.lead == 5 && info.steel))
                {
                    eligible[count++] = slot;
                }
            }
            if (count != 0) return eligible[context.next() % count];
        }

        int random = static_cast<int>(context.next() % 100);
        for (std::uint32_t slot = 1; slot <= 12; slot++)
        {
            random -= static_cast<int>(request.slotDistribution[slot - 1]);
            if (random < 0) return slot;
        }
        return 1;
    }

    std::uint32_t fluteBoost(std::uint64_t random)
    {
        if (random < 40) return 1;
        if (random < 70) return 2;
        if (random < 90) return 3;
        return 4;
    }

    std::uint32_t modifyLevel(std::uint32_t level, bool modifierPass, std::int32_t flute,
                              std::uint32_t boost, std::uint32_t maximum)
    {
        if (modifierPass) level = maximum;
        const auto adjusted = static_cast<int>(level) + static_cast<int>(flute * static_cast<std::int32_t>(boost));
        return static_cast<std::uint32_t>(std::clamp(adjusted, 1, 100));
    }

    std::uint32_t heldItem(std::uint64_t random, bool compoundEyes)
    {
        if (random < (compoundEyes ? 60U : 50U)) return 0;
        if (random < (compoundEyes ? 80U : 55U)) return 1;
        return 3;
    }

    GeneratedResult generateResult(Lookahead &stream, const Gen7WildPackedRequest &request,
                                   const ModelSnapshot &snapshot)
    {
        GenerationContext context(stream, request, snapshot);
        GeneratedResult result;
        result.random = context.current();
        result.validPokemon = context.applyDelay();
        result.delay = context.index();

        const auto leadGender = cuteCharmGender(request.lead);
        bool synchronizePass = false;
        bool cuteCharmPass = false;
        bool staticMagnetPass = false;
        bool levelModifierPass = false;
        const auto checkLead = [&](std::uint64_t random) {
            synchronizePass = random >= 50;
            cuteCharmPass = leadGender > 0 && random < 67;
            staticMagnetPass = (request.lead == 4 || request.lead == 5) && random >= 50;
            levelModifierPass = request.lead == 8 && random >= 50;
        };

        if (request.fishing != 0)
        {
            result.special = context.next() % 100 >= request.specialRate;
            context.timeElapse(12);
            if (result.special)
            {
                const auto mark = context.index();
                context.timeElapse(34);
                result.specialValue = static_cast<std::uint32_t>(context.next() % 100);
                context.rewind(mark);
            }
        }
        else if (request.specialRate > 0)
        {
            result.special = context.next() % 100 < request.specialRate;
        }

        const bool berry = request.category == 5;
        const bool normalSlot = !result.special || request.fishing != 0;
        std::int32_t flute = request.lead == 9 ? 1 : request.lead == 10 ? -1 : 0;
        if (berry)
        {
            checkLead(context.next() % 100);
            result.slot = 1;
            result.level = request.levelMin;
        }
        else if (normalSlot)
        {
            checkLead(context.next() % 100);
            result.slot = chooseNormalSlot(context, request, staticMagnetPass);
            result.level = static_cast<std::uint32_t>(
                context.next() % (request.levelMax - request.levelMin + 1) + request.levelMin);
            result.level = modifyLevel(result.level, levelModifierPass, flute,
                                       fluteBoost(context.next() % 100), request.levelMax);
        }
        else
        {
            result.slot = 0;
            result.level = request.specialLevel;
            context.timeElapse(7);
            checkLead(context.next() % 100);
            context.timeElapse(3);
        }

        auto info = slotInfo(request, result.slot);
        result.species = info.species;
        result.form = info.form;
        if (result.species == 774 && normalSlot) result.form = static_cast<std::uint32_t>(context.next() % 7);

        context.inlineDelay();
        context.advance(60);
        result.ec = static_cast<std::uint32_t>(context.next());

        const bool shinyLocked = request.category == 1 && result.special &&
                                 (request.species[0] & 0x7ff) <= 800;
        const int pidRolls = request.shinyCharm != 0 && !shinyLocked ? 3 : 1;
        for (int i = pidRolls; i > 0; i--)
        {
            result.pid = static_cast<std::uint32_t>(context.next());
            if (pokerngkit::gen7::psv(result.pid) == request.tsv)
            {
                if (shinyLocked)
                    result.pid ^= 0x10000000;
                else
                {
                    result.shiny = true;
                    result.square = pokerngkit::gen7::prv(result.pid) == request.trv;
                }
                break;
            }
        }

        if (info.fixedThreeIv)
        {
            for (int remaining = 3; remaining > 0;)
            {
                const auto index = static_cast<std::size_t>(context.next() % 6);
                if (result.ivs[index] == 0)
                {
                    result.ivs[index] = 31;
                    remaining--;
                }
            }
        }
        for (auto &iv : result.ivs)
        {
            if (iv == 0) iv = static_cast<int>(context.next() & 0x1f);
        }

        result.ability = request.category == 1 && result.special
                             ? 1
                             : static_cast<std::uint32_t>((context.next() & 1) + 1);
        result.synchronize = synchronizePass;
        result.nature = result.synchronize && request.syncNature < 25
                            ? request.syncNature
                            : static_cast<std::uint32_t>(context.next() % 25);
        result.gender = info.randomGender
                            ? (cuteCharmPass ? leadGender
                                             : static_cast<std::uint32_t>(context.next() % 252 >= info.gender ? 1 : 2))
                            : info.gender;
        result.item = heldItem(normalSlot ? context.next() % 100 : 100,
                               request.lead == 6);
        if (request.fishing != 0 && result.special)
        {
            result.slot = result.specialValue < request.hookedItemThreshold1
                              ? 1
                              : result.specialValue < request.hookedItemThreshold2 ? 2 : 3;
        }
        result.hiddenPower = pokerngkit::gen7::hiddenPower(result.ivs);
        return result;
    }

    bool matches(const Gen7WildPackedRequest &request, const GeneratedResult &result, std::uint8_t blink)
    {
        if (!result.validPokemon) return false;
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
        if (request.slotMask != 0 && (request.slotMask & (1U << result.slot)) == 0) return false;
        if (request.specialOnly != 0 && !result.special) return false;
        if (request.levelFilter != 0 && request.levelFilter != result.level) return false;
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

    Gen7WildPackedResult pack(const GeneratedResult &result, std::uint32_t frame,
                              std::uint32_t realTimeFrames, std::uint8_t blink)
    {
        std::uint32_t ivs = 0;
        for (int i = 0; i < 6; i++) ivs |= static_cast<std::uint32_t>(result.ivs[i]) << (i * 5);
        const std::uint32_t shiny = result.shiny ? (result.square ? 2U : 1U) : 0U;
        const std::uint32_t metadata =
            result.nature | result.ability << 5 | result.gender << 7 | result.hiddenPower << 9 |
            shiny << 13 | static_cast<std::uint32_t>(result.synchronize) << 15 |
            static_cast<std::uint32_t>(blink) << 16 | static_cast<std::uint32_t>(result.special) << 22;
        const std::uint32_t encounter = result.species | result.form << 11 | result.level << 19 |
                                        result.slot << 26 | result.item << 30;
        return {
            frame,
            realTimeFrames,
            static_cast<std::uint32_t>(result.random),
            static_cast<std::uint32_t>(result.random >> 32),
            result.ec,
            result.pid,
            ivs,
            metadata,
            static_cast<std::int32_t>(result.delay),
            encounter,
            result.specialValue,
        };
    }

    bool flag(std::uint32_t value) { return value <= 1; }

    bool validRequest(const Gen7WildPackedRequest &request)
    {
        const auto startingFrame = request.version < 2 ? 418U : 478U;
        if (request.version > 3 || request.minFrame < startingFrame || request.maxFrame < request.minFrame ||
            request.maxFrame > browserMaximumFrame || request.tsv > 4095 || request.trv > 15 ||
            !flag(request.shinyCharm) || (request.syncNature > 24 && request.syncNature != 0xff) ||
            request.lead > 10 || request.npc > 100 || !flag(request.raining) || !flag(request.considerDelay) ||
            request.category > 5 || request.specialRate > 100 || request.levelMin == 0 ||
            request.levelMax < request.levelMin || request.levelMax > 100 || request.specialLevel > 100 ||
            request.globalDelayType > 4 || request.delayTime < 0 || request.delayTime > 5002 ||
            request.inlineDelayType > 1 || request.inlineDelayTime < 0 || request.inlineDelayTime > 5000 ||
            request.preHoneyCorrection > 50 || (request.honeyDelay != 63 && request.honeyDelay != 93) ||
            !flag(request.fishing) || request.biteDelay > 100 || request.platformDelay < 14 ||
            request.platformDelay > 19 || request.pokemonDelay < 1 || request.pokemonDelay > 2 ||
            request.hookedItemThreshold1 > request.hookedItemThreshold2 || request.hookedItemThreshold2 > 100 ||
            !flag(request.wildCry))
            return false;
        if ((request.lead == 1) != (request.syncNature < 25)) return false;

        std::uint32_t distributionTotal = 0;
        std::uint32_t slotCount = 0;
        for (int i = 0; i < 12; i++) distributionTotal += request.slotDistribution[i];
        for (int i = 1; i < 11; i++)
        {
            if (request.species[i] != 0) slotCount++;
        }
        if (distributionTotal != 100 || slotCount == 0 || slotCount > 10) return false;
        for (std::uint32_t i = 0; i < slotCount; i++)
        {
            if (request.slotDistribution[i] == 0 || request.species[i + 1] == 0 ||
                (request.species[i + 1] & 0x7ff) > 807 || (request.slotMetadata[i + 1] & 0xff) > 224)
                return false;
        }
        for (std::uint32_t i = slotCount; i < 12; i++)
        {
            if (request.slotDistribution[i] != 0) return false;
        }

        if (!flag(request.filtersDisabled) || !flag(request.shinyOnly) || !flag(request.squareShinyOnly) ||
            request.genderFilter > 2 || request.abilityFilter > 3 || request.natureMask > allNatures ||
            request.hiddenPowerMask > 0xffff || request.slotMask > 0x7ff || !flag(request.specialOnly) ||
            request.levelFilter > 100 || request.perfectIvValue > 31 || request.perfectIvCount > 6 ||
            request.blinkFilter > 2 || request.resultLimit == 0 || request.resultLimit > maximumResults)
            return false;
        for (int i = 0; i < 6; i++)
        {
            if (request.ivMin[i] > 31 || request.ivMax[i] > 31 || request.ivMin[i] > request.ivMax[i])
                return false;
        }
        return true;
    }

    class Session
    {
      public:
        explicit Session(const Gen7WildPackedRequest &request)
            : request(request), blinkFlags(pokerngkit::gen7::createBlinkFlags(
                                    request.seed, request.minFrame, request.maxFrame, request.npc)),
              stream(makeStartingRng(request.seed, request.minFrame)),
              status(request.npc + 1, makeStartingRng(request.seed, request.minFrame), request.raining != 0),
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

        Gen7WildPackedRequest request;
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
        std::vector<Gen7WildPackedResult> results;

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

static_assert(sizeof(Gen7WildPackedRequest) == 91 * sizeof(std::uint32_t));
static_assert(sizeof(Gen7WildPackedResult) == 11 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wild_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7wild_begin(const Gen7WildPackedRequest *request)
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

    POKERNGKIT_KEEPALIVE std::uint32_t gen7wild_step(std::uint32_t maximumStates)
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

    POKERNGKIT_KEEPALIVE std::uintptr_t gen7wild_result_ptr()
    {
        return session ? reinterpret_cast<std::uintptr_t>(session->results.data()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wild_result_count()
    {
        return session ? static_cast<std::uint32_t>(session->results.size()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wild_step_processed()
    {
        return session ? session->stepProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wild_total_processed()
    {
        return session ? session->totalProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wild_total_results()
    {
        return session ? session->totalResults : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wild_done() { return session && session->isDone() ? 1 : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wild_limit_reached()
    {
        return session && session->resultLimitReached ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7wild_last_error() { return lastError; }
}

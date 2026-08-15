/*
 * PokeRNGKit Gen VII SOS WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII SOS behavior is adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including SOSRNG, SOSResult, Wild7, RNGPool and MiscRNGTool.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7sos_bridge.h"

#include "../../gen7common/gen7_rng.hpp"

#include <algorithm>
#include <array>
#include <bit>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <deque>
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

    SlotInfo slotInfo(const Gen7SosPackedRequest &request, std::uint32_t slot)
    {
        if (slot == 0 || slot > 9) return {};
        const auto value = request.species[slot - 1];
        const auto metadata = request.slotMetadata[slot - 1];
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

    class Lookahead32
    {
      public:
        explicit Lookahead32(SFMT source) : source(std::move(source)) {}

        std::uint32_t current()
        {
            ensure(0);
            return values[0];
        }

        std::uint32_t at(std::size_t offset)
        {
            ensure(offset);
            return values[offset];
        }

        void advanceBase()
        {
            ensure(0);
            values.pop_front();
        }

      private:
        SFMT source;
        std::deque<std::uint32_t> values;

        void ensure(std::size_t requested)
        {
            while (values.size() <= requested) values.push_back(source.nextUint());
        }
    };

    class BattleCursor
    {
      public:
        BattleCursor(Lookahead32 &stream, std::uint32_t offset) : stream(stream), cursor(offset) {}

        std::uint32_t next() { return stream.at(cursor++); }
        std::uint32_t index() const { return cursor; }

      private:
        Lookahead32 &stream;
        std::uint32_t cursor;
    };

    class GenerationContext
    {
      public:
        GenerationContext(Lookahead &stream, const Gen7SosPackedRequest &request,
                          const ModelSnapshot &snapshot)
            : stream(stream), request(request), modelNumber(snapshot.modelNumber), remain(snapshot.remain)
        {
        }

        std::uint64_t current() { return stream.current(); }
        std::uint64_t next() { return stream.next(); }
        std::uint32_t index() const { return stream.index(); }

        void applyDelay()
        {
            if (request.considerDelay == 0)
            {
                modelNumber = request.npc + 1;
                remain.assign(modelNumber, 0);
                return;
            }
            timeElapse(static_cast<int>(request.delayTime));
        }

      private:
        Lookahead &stream;
        const Gen7SosPackedRequest &request;
        std::uint32_t modelNumber;
        std::vector<int> remain;

        void timeElapse(int count)
        {
            for (int frame = 0; frame < count; frame++)
            {
                if (remain.size() < modelNumber) remain.resize(modelNumber);
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
    };

    struct CallRates
    {
        std::uint32_t rate1;
        std::uint32_t rate2;
    };

    std::uint32_t roundToEven(double value)
    {
        const auto lower = std::floor(value);
        const auto fraction = value - lower;
        if (fraction < 0.5) return static_cast<std::uint32_t>(lower);
        if (fraction > 0.5) return static_cast<std::uint32_t>(lower + 1.0);
        const auto integer = static_cast<std::uint32_t>(lower);
        return (integer & 1U) == 0 ? integer : integer + 1;
    }

    CallRates callRates(const Gen7SosPackedRequest &request)
    {
        auto rate1 = request.callRate * request.hpBonus * (request.adrenalineOrb != 0 ? 2U : 1U);
        rate1 = std::min(rate1, 100U);
        double rate2 = static_cast<double>(request.callRate) *
                       static_cast<double>(request.intimidate != 0 ? 0x4ccc : 0x4000) / 4096.0;
        if (request.lastCallSucceeded != 0) rate2 *= 1.5;
        if (request.superEffective != 0) rate2 *= 2.0;
        if (request.lastCallFailed != 0) rate2 *= 3.0;
        return { rate1, roundToEven(std::min(rate2, 100.0)) };
    }

    std::uint32_t chainPidBonus(std::uint32_t chainLength)
    {
        if (chainLength == 0) return 0;
        return std::min(12U, ((chainLength - 1) / 10) * 4);
    }

    std::uint32_t chainFlawlessCount(std::uint32_t chainLength)
    {
        return chainLength > 10 ? std::min(4U, chainLength / 10 + 1) : chainLength / 5;
    }

    std::uint32_t chainHiddenAbilityRate(std::uint32_t chainLength)
    {
        return std::min(15U, chainLength / 10 * 5);
    }

    std::uint32_t cuteCharmGender(std::uint32_t lead)
    {
        if (lead == 2) return 2;
        if (lead == 3) return 1;
        return 0;
    }

    std::uint32_t heldItem(std::uint32_t random, bool compoundEyes)
    {
        if (random < (compoundEyes ? 60U : 50U)) return 0;
        if (random < (compoundEyes ? 80U : 55U)) return 1;
        return 3;
    }

    std::uint32_t regularSlot(std::uint32_t random)
    {
        constexpr std::array<std::uint32_t, 7> distribution = { 1, 1, 1, 10, 10, 10, 67 };
        for (std::uint32_t index = 0; index < distribution.size(); index++)
        {
            if (random < distribution[index]) return index + 1;
            random -= distribution[index];
        }
        return 7;
    }

    struct BattlePrelude
    {
        std::uint32_t call1 = 0;
        std::uint32_t call2 = 0;
        std::uint32_t rate1 = 0;
        std::uint32_t rate2 = 0;
        std::uint32_t slot = 0;
        std::uint32_t level = 0;
        std::uint32_t nextIndex = 0;
        bool success = false;
        bool synchronize = false;
        bool cuteCharm = false;
    };

    BattlePrelude generateBattlePrelude(Lookahead32 &stream, std::uint32_t offset,
                                        const Gen7SosPackedRequest &request)
    {
        BattleCursor cursor(stream, offset);
        BattlePrelude result;
        const auto rates = callRates(request);
        result.rate1 = rates.rate1;
        result.rate2 = rates.rate2;
        result.call1 = cursor.next() % 100;
        result.call2 = cursor.next() % 100;
        result.success = result.call1 < result.rate1 && result.call2 < result.rate2;

        const auto leadRandom = cursor.next() % 100;
        result.synchronize = leadRandom >= 50;
        const auto leadGender = cuteCharmGender(request.lead);
        result.cuteCharm = leadGender > 0 && leadRandom < 67;

        std::array<std::uint32_t, 7> eligible {};
        std::uint32_t eligibleCount = 0;
        if (request.lead == 4 || request.lead == 5)
        {
            for (std::uint32_t slot = 1; slot <= 7; slot++)
            {
                const auto info = slotInfo(request, slot);
                if ((request.lead == 4 && info.electric) || (request.lead == 5 && info.steel))
                    eligible[eligibleCount++] = slot;
            }
        }
        const bool staticMagnetPass = eligibleCount != 0 && leadRandom >= 50;
        const bool levelModifierPass = request.lead == 8 && leadRandom >= 50;

        const bool weatherActive = request.weather != 0 &&
                                   (request.mode == 1 || request.species[7] != 0 || request.species[8] != 0);
        if (weatherActive)
        {
            const auto weather = cursor.next() % 100;
            if (weather < 1)
                result.slot = 8;
            else if (weather <= 10)
                result.slot = 9;
        }
        if (result.slot == 0)
        {
            const auto random = cursor.next();
            result.slot = staticMagnetPass ? eligible[random % eligibleCount] : regularSlot(random % 100);
        }

        result.level = cursor.next() % (request.levelMax - request.levelMin + 1) + request.levelMin;
        const auto fluteRandom = cursor.next() % 100;
        if (levelModifierPass) result.level = request.levelMax;
        int flute = request.lead == 9 ? 1 : request.lead == 10 ? -1 : 0;
        if (flute != 0)
        {
            const std::uint32_t boost = fluteRandom < 40 ? 1 : fluteRandom < 70 ? 2 : fluteRandom < 90 ? 3 : 4;
            result.level = static_cast<std::uint32_t>(
                std::clamp(static_cast<int>(result.level) + flute * static_cast<int>(boost), 1, 100));
        }
        result.nextIndex = cursor.index();
        return result;
    }

    struct BattleFinish
    {
        std::uint32_t item = 0;
        std::uint32_t perfectIvMask = 0;
        std::uint32_t advance = 0;
        bool hiddenAbility = false;
    };

    BattleFinish finishBattle(Lookahead32 &stream, const Gen7SosPackedRequest &request,
                              const BattlePrelude &prelude, std::uint32_t perfectIvMask)
    {
        BattleCursor cursor(stream, prelude.nextIndex);
        BattleFinish result;
        result.item = heldItem(cursor.next() % 100, request.lead == 6);
        result.perfectIvMask = perfectIvMask & 0x3f;
        const auto flawless = chainFlawlessCount(request.chainLength);
        while (std::popcount(result.perfectIvMask) < static_cast<int>(flawless))
            result.perfectIvMask |= 1U << (cursor.next() % 6);
        result.hiddenAbility = cursor.next() % 100 < chainHiddenAbilityRate(request.chainLength);
        result.advance = prelude.call1 >= prelude.rate1 ? 1 : prelude.call2 >= prelude.rate2 ? 2 : cursor.index();
        return result;
    }

    struct GeneratedPokemon
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
        std::uint32_t item = 0;
        std::uint32_t delay = 0;
        std::uint32_t perfectIvMask = 0;
        std::uint32_t battleAdvance = 0;
        BattlePrelude call;
        bool shiny = false;
        bool square = false;
    };

    GeneratedPokemon generatePokemon(Lookahead &stream, Lookahead32 &battleStream,
                                     const Gen7SosPackedRequest &request,
                                     const ModelSnapshot &snapshot)
    {
        GenerationContext context(stream, request, snapshot);
        GeneratedPokemon result;
        result.random = context.current();
        context.applyDelay();
        result.delay = context.index();
        result.call = generateBattlePrelude(battleStream, 0, request);
        result.slot = result.call.slot;
        result.level = result.call.level;
        const auto info = slotInfo(request, result.slot);
        result.species = info.species;
        result.form = info.form;

        result.ec = static_cast<std::uint32_t>(context.next());
        const int pidRolls = static_cast<int>((request.shinyCharm != 0 ? 3U : 1U) +
                                              chainPidBonus(request.chainLength));
        for (int index = 0; index < pidRolls; index++)
        {
            result.pid = static_cast<std::uint32_t>(context.next());
            if (pokerngkit::gen7::psv(result.pid) == request.tsv)
            {
                result.shiny = true;
                result.square = pokerngkit::gen7::prv(result.pid) == request.trv;
                break;
            }
        }

        if (info.fixedThreeIv)
        {
            for (int remaining = 3; remaining > 0;)
            {
                const auto iv = static_cast<std::size_t>(context.next() % 6);
                if (result.ivs[iv] == 0)
                {
                    result.ivs[iv] = 31;
                    remaining--;
                }
            }
        }
        for (auto &iv : result.ivs)
        {
            if (iv == 0) iv = static_cast<int>(context.next() & 0x1f);
        }
        result.ability = static_cast<std::uint32_t>((context.next() & 1) + 1);
        result.nature = result.call.synchronize && request.syncNature < 25
                            ? request.syncNature
                            : static_cast<std::uint32_t>(context.next() % 25);
        const auto leadGender = cuteCharmGender(request.lead);
        result.gender = info.randomGender
                            ? (result.call.cuteCharm
                                   ? leadGender
                                   : static_cast<std::uint32_t>(context.next() % 252 >= info.gender ? 1 : 2))
                            : info.gender;

        std::uint32_t initialPerfectMask = 0;
        for (std::size_t index = 0; index < result.ivs.size(); index++)
            if (result.ivs[index] == 31) initialPerfectMask |= 1U << index;
        const auto battle = finishBattle(battleStream, request, result.call, initialPerfectMask);
        result.item = battle.item;
        result.perfectIvMask = battle.perfectIvMask;
        result.battleAdvance = battle.advance;
        for (std::size_t index = 0; index < result.ivs.size(); index++)
            if ((battle.perfectIvMask & (1U << index)) != 0) result.ivs[index] = 31;
        if (battle.hiddenAbility) result.ability = 3;
        result.hiddenPower = pokerngkit::gen7::hiddenPower(result.ivs);
        return result;
    }

    bool matchesPokemon(const Gen7SosPackedRequest &request, const GeneratedPokemon &result,
                        std::uint8_t blink)
    {
        if (request.blinkFilter == 1 && blink < 4) return false;
        if (request.blinkFilter == 2 && blink >= 2) return false;
        if (request.pokemonFiltersDisabled != 0) return true;
        if (request.shinyOnly != 0 && !result.shiny) return false;
        if (request.squareShinyOnly != 0 && !result.square) return false;
        if (request.genderFilter != 0 && request.genderFilter != result.gender) return false;
        if (request.abilityFilter != 0 && request.abilityFilter != result.ability) return false;
        if (request.natureMask != 0 && (request.natureMask & (1U << result.nature)) == 0) return false;
        if (request.hiddenPowerMask != 0 && (request.hiddenPowerMask & (1U << result.hiddenPower)) == 0)
            return false;
        if (request.pokemonSlotMask != 0 && (request.pokemonSlotMask & (1U << result.slot)) == 0)
            return false;
        if (request.pokemonLevelFilter != 0 && request.pokemonLevelFilter != result.level) return false;
        int perfect = 0;
        for (int index = 0; index < 6; index++)
        {
            if (result.ivs[index] < static_cast<int>(request.ivMin[index]) ||
                result.ivs[index] > static_cast<int>(request.ivMax[index]))
                return false;
            if (result.ivs[index] >= static_cast<int>(request.perfectIvValue)) perfect++;
        }
        return perfect >= static_cast<int>(request.perfectIvCount);
    }

    bool matchesCall(const Gen7SosPackedRequest &request, const BattlePrelude &prelude,
                     const BattleFinish &finish)
    {
        if (request.callFiltersDisabled != 0) return true;
        if (request.successOnly != 0 && !prelude.success) return false;
        if (request.syncOnly != 0 && !prelude.synchronize) return false;
        if (request.hiddenAbilityOnly != 0 && !finish.hiddenAbility) return false;
        if (request.callSlotMask != 0 && (request.callSlotMask & (1U << prelude.slot)) == 0)
            return false;
        return request.callLevelFilter == 0 || request.callLevelFilter == prelude.level;
    }

    std::uint32_t packCallInfo(const BattlePrelude &call)
    {
        return call.call1 | call.call2 << 8 | call.rate1 << 16 | call.rate2 << 24;
    }

    Gen7SosPackedResult packPokemon(const GeneratedPokemon &result, std::uint32_t frame,
                                    std::uint32_t realTimeFrames, std::uint8_t blink)
    {
        std::uint32_t ivs = 0;
        for (int index = 0; index < 6; index++) ivs |= static_cast<std::uint32_t>(result.ivs[index]) << (index * 5);
        const std::uint32_t shiny = result.shiny ? (result.square ? 2U : 1U) : 0U;
        const std::uint32_t metadata =
            result.nature | result.ability << 5 | result.gender << 7 | result.hiddenPower << 9 |
            shiny << 13 | static_cast<std::uint32_t>(result.call.synchronize) << 15 |
            static_cast<std::uint32_t>(blink) << 16 | static_cast<std::uint32_t>(result.call.success) << 22;
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
            result.delay,
            encounter,
            packCallInfo(result.call),
            result.perfectIvMask,
            result.battleAdvance,
            0,
        };
    }

    Gen7SosPackedResult packCall(const BattlePrelude &prelude, const BattleFinish &finish,
                                 std::uint32_t frame, std::uint32_t random)
    {
        const std::uint32_t metadata = static_cast<std::uint32_t>(prelude.synchronize) |
                                       prelude.slot << 1 | prelude.level << 5 | finish.item << 12 |
                                       static_cast<std::uint32_t>(finish.hiddenAbility) << 14 |
                                       static_cast<std::uint32_t>(prelude.success) << 15;
        return {
            frame,
            0,
            random,
            0,
            0,
            0,
            finish.perfectIvMask,
            metadata,
            finish.advance,
            0,
            packCallInfo(prelude),
            0,
            0,
            0,
        };
    }

    bool flag(std::uint32_t value) { return value <= 1; }

    bool validCallRate(std::uint32_t value)
    {
        return value == 0 || value == 3 || value == 6 || value == 9 || value == 15;
    }

    bool validRequest(const Gen7SosPackedRequest &request)
    {
        if (request.mode > 1 || request.maxFrame < request.minFrame ||
            request.maxFrame > browserMaximumFrame || request.resultLimit == 0 ||
            request.resultLimit > maximumResults || request.chainLength > 255 ||
            request.levelMin == 0 || request.levelMax < request.levelMin || request.levelMax > 100 ||
            !validCallRate(request.callRate) ||
            (request.hpBonus != 1 && request.hpBonus != 3 && request.hpBonus != 5) ||
            !flag(request.adrenalineOrb) || !flag(request.intimidate) ||
            !flag(request.lastCallSucceeded) || !flag(request.lastCallFailed) ||
            !flag(request.superEffective))
            return false;

        if (request.mode == 0)
        {
            const auto startingFrame = request.version < 2 ? 418U : 478U;
            if (request.version > 3 || request.minFrame < startingFrame || request.tsv > 4095 ||
                request.trv > 15 || !flag(request.shinyCharm) ||
                (request.syncNature > 24 && request.syncNature != 0xff) || request.lead > 10 ||
                request.npc > 100 || !flag(request.considerDelay) || request.delayTime < 2 ||
                request.delayTime > 2002 || request.sosFrame > 1000000 || request.weather > 3 ||
                (request.lead == 1) != (request.syncNature < 25))
                return false;
            for (std::uint32_t slot = 1; slot <= 9; slot++)
            {
                const auto info = slotInfo(request, slot);
                if (slot <= 7 && info.species == 0) return false;
                if (info.species > 807 || info.gender > 224) return false;
            }
            if (!flag(request.pokemonFiltersDisabled) || !flag(request.shinyOnly) ||
                !flag(request.squareShinyOnly) || request.genderFilter > 2 ||
                request.abilityFilter > 3 || request.natureMask > allNatures ||
                request.hiddenPowerMask > 0xffff || request.perfectIvValue > 31 ||
                request.perfectIvCount > 6 || request.blinkFilter > 2 ||
                request.pokemonSlotMask > 0x3ff || request.pokemonLevelFilter > 100)
                return false;
            for (int index = 0; index < 6; index++)
            {
                if (request.ivMin[index] > 31 || request.ivMax[index] > 31 ||
                    request.ivMin[index] > request.ivMax[index])
                    return false;
            }
        }
        else
        {
            if (request.battleDelay > 10000 || !flag(request.weather) ||
                request.existingPerfectIvMask > 0x3f || !flag(request.callFiltersDisabled) ||
                !flag(request.successOnly) || !flag(request.syncOnly) ||
                !flag(request.hiddenAbilityOnly) || request.callSlotMask > 0x3ff ||
                request.callLevelFilter > 100)
                return false;
        }
        return true;
    }

    class Session
    {
      public:
        explicit Session(const Gen7SosPackedRequest &request) : request(request), currentFrame(request.minFrame)
        {
            if (request.mode == 0)
            {
                blinkFlags = pokerngkit::gen7::createBlinkFlags(
                    request.seed, request.minFrame, request.maxFrame, request.npc);
                mainStream = std::make_unique<Lookahead>(makeMainRng(request.seed, request.minFrame));
                status = std::make_unique<ModelStatus>(
                    request.npc + 1, makeMainRng(request.seed, request.minFrame), false);
                generationStatus = std::make_unique<ModelSnapshot>(request.npc + 1);
                battleStream = std::make_unique<Lookahead32>(
                    makeBattleRng(request.sosSeed, request.sosFrame));
            }
            else
            {
                battleStream = std::make_unique<Lookahead32>(
                    makeBattleRng(request.seed, request.minFrame));
            }
        }

        std::uint32_t step(std::uint32_t maximumStates)
        {
            results.clear();
            stepProcessed = 0;
            while (stepProcessed < maximumStates && !isDone())
            {
                if (request.mode == 0)
                    stepPokemon();
                else
                    stepCall();
                stepProcessed++;
                totalProcessed++;
                if (totalResults >= request.resultLimit)
                {
                    resultLimitReached = currentFrame <= request.maxFrame;
                    break;
                }
            }
            return static_cast<std::uint32_t>(results.size());
        }

        bool isDone() const { return currentFrame > request.maxFrame || totalResults >= request.resultLimit; }

        Gen7SosPackedRequest request;
        std::vector<Gen7SosPackedResult> results;
        std::uint32_t stepProcessed = 0;
        std::uint32_t totalProcessed = 0;
        std::uint32_t totalResults = 0;
        bool resultLimitReached = false;

      private:
        std::vector<std::uint8_t> blinkFlags;
        std::unique_ptr<Lookahead> mainStream;
        std::unique_ptr<ModelStatus> status;
        std::unique_ptr<ModelSnapshot> generationStatus;
        std::unique_ptr<Lookahead32> battleStream;
        std::uint32_t currentFrame;
        int frameAdvance = 0;
        std::uint32_t realTime = 0;
        std::uint32_t frameTime = 0;

        static SFMT makeMainRng(std::uint32_t seed, std::uint32_t frame)
        {
            SFMT rng(seed);
            rng.advance(frame);
            return rng;
        }

        static SFMT makeBattleRng(std::uint32_t seed, std::uint32_t frame)
        {
            SFMT rng(seed);
            rng.advanceUint(frame);
            return rng;
        }

        void stepPokemon()
        {
            if (frameAdvance == 0)
            {
                do
                {
                    frameAdvance = status->nextState();
                    realTime++;
                } while (frameAdvance == 0);
            }
            const auto blink = blinkFlags[currentFrame - request.minFrame];
            const auto generated = generatePokemon(*mainStream, *battleStream, request, *generationStatus);
            mainStream->advanceBase();
            frameAdvance--;
            if (matchesPokemon(request, generated, blink))
            {
                results.push_back(packPokemon(generated, currentFrame, frameTime * 2, blink));
                totalResults++;
            }
            currentFrame++;
            if (frameAdvance == 0)
            {
                *generationStatus = status->copy();
                frameTime = realTime;
            }
        }

        void stepCall()
        {
            const auto random = battleStream->current();
            const auto prelude = generateBattlePrelude(*battleStream, request.battleDelay, request);
            const auto finish = finishBattle(
                *battleStream, request, prelude, request.existingPerfectIvMask);
            if (matchesCall(request, prelude, finish))
            {
                results.push_back(packCall(prelude, finish, currentFrame, random));
                totalResults++;
            }
            battleStream->advanceBase();
            currentFrame++;
        }
    };

    std::unique_ptr<Session> session;
    std::uint32_t lastError = None;
}

static_assert(sizeof(Gen7SosPackedRequest) == 77 * sizeof(std::uint32_t));
static_assert(sizeof(Gen7SosPackedResult) == 14 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7sos_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7sos_begin(const Gen7SosPackedRequest *request)
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

    POKERNGKIT_KEEPALIVE std::uint32_t gen7sos_step(std::uint32_t maximumStates)
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

    POKERNGKIT_KEEPALIVE std::uintptr_t gen7sos_result_ptr()
    {
        return session ? reinterpret_cast<std::uintptr_t>(session->results.data()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7sos_result_count()
    {
        return session ? static_cast<std::uint32_t>(session->results.size()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7sos_step_processed()
    {
        return session ? session->stepProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7sos_total_processed()
    {
        return session ? session->totalProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7sos_total_results()
    {
        return session ? session->totalResults : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7sos_done() { return session && session->isDone() ? 1 : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7sos_limit_reached()
    {
        return session && session->resultLimitReached ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7sos_last_error() { return lastError; }
}

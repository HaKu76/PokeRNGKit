/*
 * PokeRNGKit Gen VII Stationary WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Stationary behavior is adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including its SFMT implementation by Rei HOBARA.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7stationary_bridge.h"

#include <algorithm>
#include <array>
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

    class SFMT
    {
      public:
        static constexpr int N = 157;
        static constexpr int N32 = N * 4;
        static constexpr int POS1 = 122;
        static constexpr int SL1 = 18;
        static constexpr int SR1 = 11;
        static constexpr std::uint32_t MSK1 = 0xdfffffefU;
        static constexpr std::uint32_t MSK2 = 0xddfecb7fU;
        static constexpr std::uint32_t MSK3 = 0xbffaffffU;
        static constexpr std::uint32_t MSK4 = 0xbffffff6U;

        explicit SFMT(std::uint32_t seed)
        {
            state[0] = seed;
            for (int i = 1; i < N32; i++)
            {
                state[i] = 1812433253U * (state[i - 1] ^ (state[i - 1] >> 30)) + static_cast<std::uint32_t>(i);
            }
            periodCertification();
        }

        std::uint32_t nextUint()
        {
            if (index >= N32)
            {
                generate();
                index = 0;
            }
            return state[index++];
        }

        std::uint64_t nextUlong()
        {
            return static_cast<std::uint64_t>(nextUint()) | (static_cast<std::uint64_t>(nextUint()) << 32);
        }

        void advance(std::uint32_t count)
        {
            for (std::uint32_t i = 0; i < count; i++) nextUlong();
        }

      private:
        std::array<std::uint32_t, N32> state {};
        int index = N32;

        void periodCertification()
        {
            constexpr std::array<std::uint32_t, 4> parity = { 1U, 0U, 0U, 0x13c9e684U };
            std::uint32_t inner = 0;
            for (int i = 0; i < 4; i++) inner ^= state[i] & parity[i];
            for (int i = 16; i > 0; i >>= 1) inner ^= inner >> i;
            if ((inner & 1U) != 0) return;
            for (int i = 0; i < 4; i++)
            {
                for (std::uint32_t bit = 1; bit != 0; bit <<= 1)
                {
                    if ((bit & parity[i]) != 0)
                    {
                        state[i] ^= bit;
                        return;
                    }
                }
            }
        }

        void generate()
        {
            int a = 0;
            int b = POS1 * 4;
            int c = (N - 2) * 4;
            int d = (N - 1) * 4;
            do
            {
                state[a + 3] ^= state[a + 3] << 8 ^ state[a + 2] >> 24 ^ state[c + 3] >> 8 ^
                                  (state[b + 3] >> SR1 & MSK4) ^ state[d + 3] << SL1;
                state[a + 2] ^= state[a + 2] << 8 ^ state[a + 1] >> 24 ^ state[c + 3] << 24 ^
                                  state[c + 2] >> 8 ^ (state[b + 2] >> SR1 & MSK3) ^ state[d + 2] << SL1;
                state[a + 1] ^= state[a + 1] << 8 ^ state[a] >> 24 ^ state[c + 2] << 24 ^ state[c + 1] >> 8 ^
                                  (state[b + 1] >> SR1 & MSK2) ^ state[d + 1] << SL1;
                state[a] ^= state[a] << 8 ^ state[c + 1] << 24 ^ state[c] >> 8 ^
                              (state[b] >> SR1 & MSK1) ^ state[d] << SL1;
                c = d;
                d = a;
                a += 4;
                b += 4;
                if (b >= N32) b = 0;
            } while (a < N32);
        }
    };

    class Lookahead
    {
      public:
        explicit Lookahead(SFMT source) : source(std::move(source)) {}

        std::uint64_t current()
        {
            ensure(0);
            return values[0];
        }

        std::uint64_t next()
        {
            cursor++;
            ensure(static_cast<std::size_t>(cursor));
            return values[static_cast<std::size_t>(cursor)];
        }

        void advance(std::uint32_t count) { cursor += count; }

        std::uint32_t index() const { return static_cast<std::uint32_t>(cursor + 1); }

        void advanceBase()
        {
            ensure(0);
            values.pop_front();
            cursor = -1;
        }

      private:
        SFMT source;
        std::deque<std::uint64_t> values;
        std::int64_t cursor = -1;

        void ensure(std::size_t requested)
        {
            while (values.size() <= requested) values.push_back(source.nextUlong());
        }
    };

    struct ModelSnapshot
    {
        std::uint32_t modelNumber;
        std::vector<int> remain;
        bool phase = false;

        explicit ModelSnapshot(std::uint32_t modelNumber) : modelNumber(modelNumber), remain(modelNumber) {}
    };

    class ModelStatus
    {
      public:
        ModelStatus(std::uint32_t modelNumber, SFMT rng, bool raining)
            : rng(std::move(rng)), snapshot(modelNumber), raining(raining)
        {
        }

        int nextState()
        {
            int count = 0;
            for (std::uint32_t i = 0; i < snapshot.modelNumber; i++)
            {
                if (snapshot.remain[i] > 1)
                {
                    snapshot.remain[i]--;
                    continue;
                }
                if (snapshot.remain[i] < 0)
                {
                    if (++snapshot.remain[i] == 0)
                    {
                        snapshot.remain[i] = next(count) % 3 == 0 ? 36 : 30;
                    }
                    continue;
                }
                if ((next(count) & 0x7f) == 0) snapshot.remain[i] = -5;
            }
            if (raining && (snapshot.phase = !snapshot.phase))
            {
                rng.nextUlong();
                rng.nextUlong();
                count += 2;
            }
            return count;
        }

        ModelSnapshot copy() const { return snapshot; }

      private:
        SFMT rng;
        ModelSnapshot snapshot;
        bool raining;

        std::uint64_t next(int &count)
        {
            count++;
            return rng.nextUlong();
        }
    };

    class GenerationContext
    {
      public:
        GenerationContext(Lookahead &stream, const Gen7StationaryPackedRequest &request,
                          const ModelSnapshot &snapshot)
            : stream(stream), request(request), modelNumber(snapshot.modelNumber), remain(snapshot.remain),
              phase(snapshot.phase)
        {
        }

        std::uint64_t current() { return stream.current(); }
        std::uint64_t next() { return stream.next(); }
        void advance(std::uint32_t count) { stream.advance(count); }
        std::uint32_t index() const { return stream.index(); }

        void applyDelay()
        {
            if (request.considerDelay != 0)
                stationaryDelay();
            else
                resetModelStatus();
        }

        void timeElapse(int count)
        {
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
        const Gen7StationaryPackedRequest &request;
        std::uint32_t modelNumber;
        std::vector<int> remain;
        bool phase;

        int delayTime() const { return request.delay / 2 + 2; }

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

        void changeModelNumber(std::uint32_t count)
        {
            ensureModelStorage(count);
            modelNumber = count;
        }

        void rearrange(const std::vector<std::uint32_t> &indices)
        {
            std::vector<int> rearranged(indices.size());
            for (std::size_t i = 0; i < indices.size(); i++)
            {
                rearranged[i] = indices[i] < remain.size() ? remain[indices[i]] : 0;
            }
            remain = std::move(rearranged);
            modelNumber = static_cast<std::uint32_t>(remain.size());
        }

        void cry(std::uint32_t index)
        {
            ensureModelStorage(modelNumber);
            for (std::uint32_t i = 0; i < modelNumber; i++)
            {
                if (i == index) advance(1);
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
            if (index >= modelNumber) advance(1);
        }

        void splitDelay(int totalDelay, int cryDelay)
        {
            timeElapse(totalDelay - cryDelay);
            advance(1);
            timeElapse(cryDelay);
        }

        void stationaryDelay()
        {
            const int delay = delayTime();
            switch (request.delayType)
            {
                case 1:
                case 2:
                {
                    const int cryDelay = request.delayType == 1 ? 78 : 75;
                    timeElapse(delay - cryDelay - 20);
                    if (modelNumber == 7) rearrange({ 0, 1, 2, 5, 6 });
                    timeElapse(19);
                    cry(3);
                    timeElapse(cryDelay);
                    break;
                }
                case 3:
                    timeElapse(3);
                    changeModelNumber(2);
                    splitDelay(delay - 3, delay - 45);
                    break;
                case 4:
                    advance(2);
                    timeElapse(delay - 2);
                    modelNumber = 1;
                    timeElapse(2);
                    break;
                case 5:
                    timeElapse(delay - 2);
                    ensureModelStorage(6);
                    remain[1] = remain[3] = remain[4] = remain[5] = 0;
                    timeElapse(2);
                    break;
                case 6:
                    advance(2);
                    timeElapse(delay - 27);
                    advance(1);
                    timeElapse(25);
                    modelNumber = 1;
                    timeElapse(2);
                    break;
                case 9:
                    timeElapse(delay - 77);
                    cry(8);
                    timeElapse(76);
                    break;
                case 10:
                    timeElapse(delay - 74);
                    if (modelNumber == 9) rearrange({ 0, 1, 2, 6, 7, 8 });
                    splitDelay(74, 73);
                    break;
                case 11:
                case 21:
                    splitDelay(delay, 36);
                    break;
                case 12:
                    splitDelay(delay, 51);
                    break;
                case 13:
                case 23:
                    timeElapse(29);
                    changeModelNumber(3);
                    timeElapse(delay - 64);
                    cry(2);
                    timeElapse(34);
                    break;
                case 14:
                    timeElapse(11);
                    changeModelNumber(2);
                    splitDelay(delay - 11, 35);
                    break;
                case 15:
                    splitDelay(delay, 50);
                    break;
                case 16:
                    splitDelay(delay, 43);
                    break;
                case 17:
                    splitDelay(delay, 40);
                    break;
                case 22:
                    advance(2);
                    timeElapse(delay - 376);
                    changeModelNumber(1);
                    timeElapse(214);
                    changeModelNumber(2);
                    splitDelay(162, 51);
                    break;
                case 24:
                    timeElapse(delay - 412);
                    changeModelNumber(2);
                    timeElapse(42);
                    changeModelNumber(1);
                    timeElapse(93);
                    changeModelNumber(2);
                    splitDelay(277, 35);
                    break;
                case 25:
                    timeElapse(66);
                    changeModelNumber(1);
                    timeElapse(34);
                    changeModelNumber(2);
                    timeElapse(165);
                    changeModelNumber(1);
                    timeElapse(77);
                    changeModelNumber(2);
                    splitDelay(delay - 342, 50);
                    break;
                case 26:
                    timeElapse(77);
                    changeModelNumber(1);
                    timeElapse(34);
                    changeModelNumber(2);
                    timeElapse(91);
                    changeModelNumber(3);
                    timeElapse(61);
                    changeModelNumber(2);
                    timeElapse(369);
                    changeModelNumber(4);
                    remain[3] = remain[2];
                    remain[2] = 0;
                    timeElapse(71);
                    changeModelNumber(2);
                    splitDelay(delay - 703, 43);
                    break;
                case 27:
                    timeElapse(196);
                    changeModelNumber(1);
                    timeElapse(101);
                    changeModelNumber(2);
                    splitDelay(delay - 297, 40);
                    break;
                default:
                    timeElapse(delay);
                    break;
            }
        }
    };

    std::vector<std::uint8_t> noNpcBlinkFlags(std::uint32_t seed, std::uint32_t minFrame,
                                               std::uint32_t maxFrame)
    {
        std::vector<std::uint8_t> flags(maxFrame - minFrame + 2);
        SFMT rng(seed);
        int blinkFlag = 0;
        for (std::uint32_t i = 0; i < minFrame - 2; i++) rng.nextUlong();
        if (minFrame < 2)
        {
            for (std::uint32_t i = 0; i < minFrame; i++) rng.nextUlong();
        }
        else if ((rng.nextUlong() & 0x7f) == 0)
        {
            flags[0] = rng.nextUlong() % 3 == 0 ? 36 : 30;
        }
        else if ((rng.nextUlong() & 0x7f) == 0)
        {
            blinkFlag = 1;
        }
        for (std::uint32_t frame = minFrame; frame <= maxFrame; frame++)
        {
            const auto random = rng.nextUlong();
            if (blinkFlag == 1)
            {
                flags[frame - minFrame] = 5;
                frame++;
                flags[frame - minFrame] = random % 3 == 0 ? 36 : 30;
                blinkFlag = 0;
                rng.nextUlong();
            }
            if ((random & 0x7f) == 0) blinkFlag = flags[frame - minFrame] = 1;
        }
        return flags;
    }

    bool blinkCheckAfter(const std::deque<std::uint64_t> &values)
    {
        for (std::size_t i = 1; i + 1 < values.size(); i++)
        {
            if ((values[i] & 0x7f) == 0) return true;
        }
        return values.back() % 3 == 0;
    }

    std::vector<std::uint8_t> multipleNpcBlinkFlags(std::uint32_t seed, std::uint32_t minFrame,
                                                     std::uint32_t maxFrame, std::uint32_t modelNumber)
    {
        std::vector<std::uint8_t> flags(maxFrame - minFrame + 2);
        SFMT rng(seed);
        const std::array<int, 2> unsafeRange = {
            35 * static_cast<int>(modelNumber - 1),
            41 * static_cast<int>(modelNumber - 1),
        };
        const auto minimum = static_cast<std::uint32_t>(
            std::max<std::int64_t>(static_cast<std::int64_t>(minFrame) - unsafeRange[1], 418));
        rng.advance(minimum);
        std::deque<std::uint64_t> randoms;
        for (std::uint32_t i = 0; i <= (modelNumber - 1) * 5 + 1; i++) randoms.push_back(rng.nextUlong());
        int blinkFlag = 0;
        for (std::uint32_t frame = minimum; frame <= maxFrame; frame++)
        {
            if ((randoms[0] & 0x7f) == 0)
            {
                if (frame >= minFrame) flags[frame - minFrame] = blinkFlag == 0 ? 1 : 3;
                blinkFlag = unsafeRange[blinkFlag == 0 && !blinkCheckAfter(randoms) ? 0 : 1];
            }
            else if (blinkFlag > 0)
            {
                blinkFlag--;
                if (frame >= minFrame) flags[frame - minFrame] = 2;
            }
            randoms.pop_front();
            randoms.push_back(rng.nextUlong());
        }
        return flags;
    }

    std::vector<std::uint8_t> createBlinkFlags(const Gen7StationaryPackedRequest &request)
    {
        const auto modelNumber = request.npc + 1;
        return modelNumber == 1
                   ? noNpcBlinkFlags(request.seed, request.minFrame, request.maxFrame)
                   : multipleNpcBlinkFlags(request.seed, request.minFrame, request.maxFrame, modelNumber);
    }

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
        bool synchronize = false;
        std::uint32_t delay = 0;
    };

    std::uint32_t psv(std::uint32_t pid) { return ((pid >> 16) ^ (pid & 0xffff)) >> 4; }
    std::uint32_t prv(std::uint32_t pid) { return ((pid >> 16) ^ (pid & 0xffff)) & 0xf; }

    std::uint32_t hiddenPower(const std::array<int, 6> &ivs)
    {
        constexpr std::array<int, 6> order = { 0, 1, 2, 4, 5, 3 };
        int value = 0;
        for (int i = 0; i < 6; i++) value += (ivs[i] & 1) << order[i];
        return static_cast<std::uint32_t>(15 * value / 63);
    }

    GeneratedResult generateResult(Lookahead &stream, const Gen7StationaryPackedRequest &request,
                                   const ModelSnapshot &snapshot)
    {
        GenerationContext context(stream, request, snapshot);
        GeneratedResult result;
        result.random = context.current();
        context.applyDelay();
        result.delay = context.index();

        for (int i = 0; i < 6; i++) result.ivs[i] = request.ivs[i];
        if (request.trade != 0)
        {
            for (int i = 0; i < 6; i++)
            {
                if (result.ivs[i] < 0) result.ivs[i] = static_cast<int>(context.next() & 0x1f);
            }
            result.ability = request.ability;
            result.nature = request.syncNature;
            result.gender = request.gender;
            result.ec = static_cast<std::uint32_t>(context.next());
            result.pid = static_cast<std::uint32_t>(context.next());
            if (psv(result.pid) == request.tsv) result.pid ^= 0x10000000;
            result.hiddenPower = hiddenPower(result.ivs);
            return result;
        }

        if (request.alwaysSync != 0)
        {
            result.synchronize = true;
        }
        else
        {
            const bool sync = context.next() % 100 >= 50;
            context.timeElapse(3);
            result.synchronize = sync || request.postNatureLock != 0;
            context.advance(60);
        }

        if (request.pelago != 0)
        {
            context.advance(60 + request.pelagoShift);
            result.ec = static_cast<std::uint32_t>(context.next());
            context.advance(1);
        }
        else
        {
            result.ec = static_cast<std::uint32_t>(context.next());
        }

        int pidRolls = request.shinyCharm != 0 && request.shinyLocked == 0 && request.alwaysSync == 0 ? 3 : 1;
        if (request.postNatureLock != 0) pidRolls = request.shinyCharm != 0 ? 3 : 1;
        for (int roll = 0; roll < pidRolls; roll++)
        {
            result.pid = static_cast<std::uint32_t>(context.next());
            if (psv(result.pid) == request.tsv)
            {
                if (request.shinyLocked != 0)
                {
                    result.pid ^= 0x10000000;
                }
                else
                {
                    result.shiny = true;
                    result.square = request.fateful != 0 || prv(result.pid) == request.trv;
                }
                break;
            }
            if (request.forcedShiny != 0)
            {
                result.shiny = true;
                result.square = true;
                const auto low = result.pid & 0xffff;
                result.pid = ((((request.tsv << 4) + request.trv) ^ low) << 16) | low;
            }
        }

        int perfect = request.fixedThreeIv != 0 ? 3 : 0;
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
        result.ability = request.ability > 0 ? request.ability : static_cast<std::uint32_t>((context.next() & 1) + 1);
        result.nature = result.synchronize && request.syncNature < 25 ? request.syncNature
                                                                      : static_cast<std::uint32_t>(context.next() % 25);
        result.gender = request.randomGender != 0
                            ? (context.next() % 252 >= request.gender ? 1 : 2)
                            : request.gender;
        result.hiddenPower = hiddenPower(result.ivs);
        return result;
    }

    bool matches(const Gen7StationaryPackedRequest &request, const GeneratedResult &result, std::uint8_t blink)
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

    Gen7StationaryPackedResult pack(const GeneratedResult &result, std::uint32_t frame,
                                    std::uint32_t realTimeFrames, std::uint8_t blink)
    {
        std::uint32_t ivs = 0;
        for (int i = 0; i < 6; i++) ivs |= static_cast<std::uint32_t>(result.ivs[i]) << (i * 5);
        std::uint32_t metadata = result.nature | result.ability << 5 | result.gender << 7 |
                                 result.hiddenPower << 9 | static_cast<std::uint32_t>(result.shiny) << 13 |
                                 static_cast<std::uint32_t>(result.square) << 14 |
                                 static_cast<std::uint32_t>(result.synchronize) << 15 |
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

    bool validGender(std::uint32_t value)
    {
        constexpr std::array<std::uint32_t, 8> values = { 0, 1, 2, 30, 62, 126, 190, 224 };
        return std::find(values.begin(), values.end(), value) != values.end();
    }

    bool validRequest(const Gen7StationaryPackedRequest &request)
    {
        const auto startingFrame = request.version < 2 ? 418U : 478U;
        if (request.version > 3 || request.minFrame < startingFrame || request.maxFrame < request.minFrame ||
            request.maxFrame > browserMaximumFrame || request.tsv > 4095 || request.trv > 15 ||
            !flag(request.shinyCharm) || (request.syncNature > 24 && request.syncNature != 0xff) ||
            request.npc > 100 || request.delay < -4 || request.delay > 4000 || request.delayType > 27 ||
            !flag(request.considerDelay) || !flag(request.raining) || request.pelagoShift > 255 ||
            request.species > 807 || request.form > 255 || request.level > 100 || !validGender(request.gender) ||
            !flag(request.randomGender) || request.ability > 3)
            return false;
        for (int i = 0; i < 6; i++)
        {
            if (request.ivs[i] < -1 || request.ivs[i] > 31 || request.ivMin[i] > 31 || request.ivMax[i] > 31 ||
                request.ivMin[i] > request.ivMax[i])
                return false;
        }
        if (!flag(request.fixedThreeIv) || !flag(request.alwaysSync) || !flag(request.shinyLocked) ||
            !flag(request.forcedShiny) || !flag(request.pelago) || !flag(request.trade) || !flag(request.fateful) ||
            !flag(request.postNatureLock) || !flag(request.filtersDisabled) || !flag(request.shinyOnly) ||
            !flag(request.squareShinyOnly) || request.genderFilter > 2 || request.abilityFilter > 3 ||
            request.natureMask > allNatures || request.hiddenPowerMask > 0xffff || request.perfectIvValue > 31 ||
            request.perfectIvCount > 6 || request.blinkFilter > 2 || request.resultLimit == 0 ||
            request.resultLimit > maximumResults || (request.pelago == 0 && request.pelagoShift != 0) ||
            (request.blinkFilter == 1 && request.npc != 0) || (request.blinkFilter == 2 && request.npc == 0))
            return false;
        return request.randomGender == (request.gender > 2 ? 1U : 0U);
    }

    class Session
    {
      public:
        explicit Session(const Gen7StationaryPackedRequest &request)
            : request(request), blinkFlags(createBlinkFlags(request)),
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

        Gen7StationaryPackedRequest request;
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
        std::vector<Gen7StationaryPackedResult> results;

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

static_assert(sizeof(Gen7StationaryPackedRequest) == 57 * sizeof(std::uint32_t));
static_assert(sizeof(Gen7StationaryPackedResult) == 9 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7stationary_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7stationary_begin(const Gen7StationaryPackedRequest *request)
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

    POKERNGKIT_KEEPALIVE std::uint32_t gen7stationary_step(std::uint32_t maximumStates)
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

    POKERNGKIT_KEEPALIVE std::uintptr_t gen7stationary_result_ptr()
    {
        return session ? reinterpret_cast<std::uintptr_t>(session->results.data()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7stationary_result_count()
    {
        return session ? static_cast<std::uint32_t>(session->results.size()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7stationary_step_processed()
    {
        return session ? session->stepProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7stationary_total_processed()
    {
        return session ? session->totalProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7stationary_total_results()
    {
        return session ? session->totalResults : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7stationary_done()
    {
        return session && session->isDone() ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7stationary_limit_reached()
    {
        return session && session->resultLimitReached ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7stationary_last_error() { return lastError; }
}

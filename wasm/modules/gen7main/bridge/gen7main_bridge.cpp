/*
 * PokeRNGKit Gen VII Main RNG Tool WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Seed recovery is adapted from Admiral-Fish/needle-searcher (GPL-3.0),
 * which is based on ukikagi/poke6-seed-finder. Gen VII clock and timing
 * behavior is adapted from 3DSRNGTool by wwwwwzx (MIT), including its
 * SFMT implementation by Rei HOBARA.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7main_bridge.h"

#include "../../gen7common/gen7_rng.hpp"

#include <array>
#include <cstdint>
#include <limits>
#include <utility>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#include <wasm_simd128.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

namespace
{
    using pokerngkit::gen7::SFMT;

    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint64_t seedSpace = 0x100000000ULL;
    constexpr std::uint32_t maximumSeedChunk = 1U << 24;
    constexpr std::uint32_t maximumFrame = 100000000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
    };

    thread_local std::vector<Gen7MainSeedResult> seedResults;
    thread_local std::vector<Gen7MainQrResult> qrResults;
    thread_local std::int32_t primaryTime = 0;
    thread_local std::int32_t secondaryTime = 0;
    thread_local std::uint32_t lastError = None;

#ifdef __EMSCRIPTEN__
    using Lane4 = v128_t;

    Lane4 laneSplat(std::uint32_t value) { return wasm_i32x4_splat(static_cast<std::int32_t>(value)); }
    Lane4 laneMake(std::uint32_t a, std::uint32_t b, std::uint32_t c, std::uint32_t d)
    {
        return wasm_i32x4_make(static_cast<std::int32_t>(a), static_cast<std::int32_t>(b),
                              static_cast<std::int32_t>(c), static_cast<std::int32_t>(d));
    }
    Lane4 laneAdd(Lane4 left, Lane4 right) { return wasm_i32x4_add(left, right); }
    Lane4 laneMultiply(Lane4 left, Lane4 right) { return wasm_i32x4_mul(left, right); }
    Lane4 laneXor(Lane4 left, Lane4 right) { return wasm_v128_xor(left, right); }
    Lane4 laneAnd(Lane4 left, Lane4 right) { return wasm_v128_and(left, right); }
    Lane4 laneNot(Lane4 value) { return wasm_v128_not(value); }
    Lane4 laneShiftLeft(Lane4 value, int count) { return wasm_i32x4_shl(value, count); }
    Lane4 laneShiftRight(Lane4 value, int count) { return wasm_u32x4_shr(value, count); }
    std::uint32_t laneGet(Lane4 value, int index)
    {
        switch (index)
        {
            case 0: return static_cast<std::uint32_t>(wasm_i32x4_extract_lane(value, 0));
            case 1: return static_cast<std::uint32_t>(wasm_i32x4_extract_lane(value, 1));
            case 2: return static_cast<std::uint32_t>(wasm_i32x4_extract_lane(value, 2));
            default: return static_cast<std::uint32_t>(wasm_i32x4_extract_lane(value, 3));
        }
    }
#else
    struct alignas(16) Lane4
    {
        std::array<std::uint32_t, 4> values {};
    };

    Lane4 laneSplat(std::uint32_t value) { return { { value, value, value, value } }; }
    Lane4 laneMake(std::uint32_t a, std::uint32_t b, std::uint32_t c, std::uint32_t d)
    {
        return { { a, b, c, d } };
    }
    Lane4 laneAdd(const Lane4 &left, const Lane4 &right)
    {
        Lane4 result;
        for (int i = 0; i < 4; i++) result.values[i] = left.values[i] + right.values[i];
        return result;
    }
    Lane4 laneMultiply(const Lane4 &left, const Lane4 &right)
    {
        Lane4 result;
        for (int i = 0; i < 4; i++) result.values[i] = left.values[i] * right.values[i];
        return result;
    }
    Lane4 laneXor(const Lane4 &left, const Lane4 &right)
    {
        Lane4 result;
        for (int i = 0; i < 4; i++) result.values[i] = left.values[i] ^ right.values[i];
        return result;
    }
    Lane4 laneAnd(const Lane4 &left, const Lane4 &right)
    {
        Lane4 result;
        for (int i = 0; i < 4; i++) result.values[i] = left.values[i] & right.values[i];
        return result;
    }
    Lane4 laneNot(const Lane4 &value)
    {
        Lane4 result;
        for (int i = 0; i < 4; i++) result.values[i] = ~value.values[i];
        return result;
    }
    Lane4 laneShiftLeft(const Lane4 &value, int count)
    {
        Lane4 result;
        for (int i = 0; i < 4; i++) result.values[i] = value.values[i] << count;
        return result;
    }
    Lane4 laneShiftRight(const Lane4 &value, int count)
    {
        Lane4 result;
        for (int i = 0; i < 4; i++) result.values[i] = value.values[i] >> count;
        return result;
    }
    std::uint32_t laneGet(const Lane4 &value, int index) { return value.values[index]; }
#endif

    Lane4 laneXor6(Lane4 a, Lane4 b, Lane4 c, Lane4 d, Lane4 e, Lane4 f)
    {
        return laneXor(laneXor(laneXor(a, b), laneXor(c, d)), laneXor(e, f));
    }

    class MultiSFMT
    {
      public:
        void initialize(Lane4 seeds)
        {
            index = state.size();
            state[0] = seeds;
            for (std::size_t i = 1; i < state.size(); i++)
            {
                const auto mixed = laneXor(state[i - 1], laneShiftRight(state[i - 1], 30));
                state[i] = laneAdd(laneMultiply(laneSplat(1812433253U), mixed),
                                   laneSplat(static_cast<std::uint32_t>(i)));
            }
            periodCertification(seeds);
        }

        void advance(std::uint32_t advances)
        {
            index += static_cast<std::size_t>(advances) * 2;
            while (index > state.size())
            {
                shuffle();
                index -= state.size();
            }
        }

        std::array<std::uint32_t, 4> nextNeedles()
        {
            if (index == state.size())
            {
                shuffle();
                index = 0;
            }
            const auto low = state[index];
            const auto high = state[index + 1];
            index += 2;
            std::array<std::uint32_t, 4> needles {};
            for (int lane = 0; lane < 4; lane++)
            {
                const auto value = static_cast<std::uint64_t>(laneGet(low, lane)) |
                                   (static_cast<std::uint64_t>(laneGet(high, lane)) << 32);
                needles[lane] = static_cast<std::uint32_t>(value % 17);
            }
            return needles;
        }

      private:
        std::array<Lane4, 624> state {};
        std::size_t index = state.size();

        void periodCertification(Lane4 seeds)
        {
            auto inner = laneAnd(seeds, laneSplat(1));
            inner = laneXor(inner, laneAnd(state[3], laneSplat(0x13c9e684U)));
            for (int shift : { 16, 8, 4, 2, 1 }) inner = laneXor(inner, laneShiftRight(inner, shift));
            state[0] = laneXor(state[0], laneAnd(laneNot(inner), laneSplat(1)));
        }

        void shuffle()
        {
            int a = 0;
            int b = 488;
            int c = 616;
            int d = 620;
            do
            {
                state[a + 3] = laneXor6(state[a + 3], laneShiftLeft(state[a + 3], 8),
                                        laneShiftRight(state[a + 2], 24), laneShiftRight(state[c + 3], 8),
                                        laneAnd(laneShiftRight(state[b + 3], 11), laneSplat(0xbffffff6U)),
                                        laneShiftLeft(state[d + 3], 18));
                state[a + 2] = laneXor6(state[a + 2], laneShiftLeft(state[a + 2], 8),
                                        laneShiftRight(state[a + 1], 24),
                                        laneXor(laneShiftLeft(state[c + 3], 24), laneShiftRight(state[c + 2], 8)),
                                        laneAnd(laneShiftRight(state[b + 2], 11), laneSplat(0xbffaffffU)),
                                        laneShiftLeft(state[d + 2], 18));
                state[a + 1] = laneXor6(state[a + 1], laneShiftLeft(state[a + 1], 8),
                                        laneShiftRight(state[a], 24),
                                        laneXor(laneShiftLeft(state[c + 2], 24), laneShiftRight(state[c + 1], 8)),
                                        laneAnd(laneShiftRight(state[b + 1], 11), laneSplat(0xddfecb7fU)),
                                        laneShiftLeft(state[d + 1], 18));
                state[a] = laneXor6(state[a], laneShiftLeft(state[a], 8), laneShiftLeft(state[c + 1], 24),
                                    laneShiftRight(state[c], 8),
                                    laneAnd(laneShiftRight(state[b], 11), laneSplat(0xdfffffefU)),
                                    laneShiftLeft(state[d], 18));
                c = d;
                d = a;
                a += 4;
                b += 4;
                if (b >= 624) b = 0;
            } while (a < 624);
        }
    };

    bool allowedFuzzyShift(std::uint32_t shift)
    {
        return shift == 15 || shift == 16 || shift == 0 || shift == 1 || shift == 2;
    }

    class TimeModelStatus
    {
      public:
        TimeModelStatus(std::uint32_t modelNumber, SFMT rng, bool raining)
            : rng(std::move(rng)), remain(modelNumber), raining(raining)
        {
        }

        int nextState()
        {
            int count = 0;
            for (auto &remaining : remain)
            {
                if (remaining > 1)
                {
                    remaining--;
                    continue;
                }
                if (remaining < 0)
                {
                    if (++remaining == 0) remaining = next(count) % 3 == 0 ? 36 : 30;
                    continue;
                }
                if ((next(count) & 0x7f) == 0) remaining = -5;
            }
            if (raining && (phase = !phase)) count += frameShift(2);
            return count;
        }

        int frameShift(int count)
        {
            rng.advance(static_cast<std::uint32_t>(count));
            return count;
        }

      private:
        SFMT rng;
        std::vector<int> remain;
        bool raining;
        bool phase = false;

        std::uint64_t next(int &count)
        {
            count++;
            return rng.nextUlong();
        }
    };

    std::pair<std::int32_t, std::int32_t> calculateTime(std::uint32_t seed, std::int32_t minimum,
                                                        std::int32_t maximum, std::uint32_t modelNumber,
                                                        bool fidget, bool raining)
    {
        if (minimum > maximum)
        {
            const auto result = calculateTime(seed, maximum, minimum, modelNumber, fidget, raining);
            return { -result.first, -result.second };
        }

        SFMT rng(seed);
        rng.advance(static_cast<std::uint32_t>(minimum));
        std::array<std::int32_t, 2> totalFrames {};
        std::int32_t frameTime = 0;
        std::int32_t timer = 0;
        std::int32_t fidgetCount = -1;
        constexpr std::int32_t fidgetCooldown = 452;
        TimeModelStatus status(modelNumber, rng, raining);

        for (std::int32_t frame = minimum; frame <= maximum;)
        {
            if (fidget)
            {
                for (; fidgetCount < frameTime / fidgetCooldown; fidgetCount++) frame += status.frameShift(2);
            }
            int frameAdvance = 0;
            do
            {
                frameAdvance = status.nextState();
                totalFrames[timer]++;
            } while (frameAdvance == 0);
            frame += frameAdvance;
            if (frame == maximum) timer = 1;
            if (frame <= maximum) frameTime = totalFrames[0];
        }
        totalFrames[0] = frameTime;
        return { totalFrames[0], totalFrames[1] };
    }
}

static_assert(sizeof(Gen7MainSeedResult) == 8);
static_assert(sizeof(Gen7MainQrResult) == 8);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7main_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7main_search_seed(std::uint32_t startSeed,
                                                            std::uint32_t seedCount,
                                                            std::uint32_t offset,
                                                            const std::uint32_t *needles,
                                                            std::uint32_t needleCount,
                                                            std::uint32_t fuzzy)
    {
        seedResults.clear();
        lastError = None;
        const auto rangeEnd = static_cast<std::uint64_t>(startSeed) + seedCount;
        const bool validOffset = fuzzy == 0 ? offset == 417 || offset == 477 : offset == 1012 || offset == 1132;
        const auto minimumNeedles = fuzzy == 0 ? 8U : 9U;
        if (needles == nullptr || seedCount == 0 || seedCount > maximumSeedChunk || rangeEnd > seedSpace ||
            fuzzy > 1 || !validOffset || needleCount < minimumNeedles || needleCount > 16)
        {
            lastError = InvalidInput;
            return 0;
        }
        for (std::uint32_t i = 0; i < needleCount; i++)
        {
            if (needles[i] > 16)
            {
                lastError = InvalidInput;
                return 0;
            }
        }

        MultiSFMT rng;
        for (std::uint64_t base = startSeed; base < rangeEnd; base += 4)
        {
            rng.initialize(laneMake(static_cast<std::uint32_t>(base), static_cast<std::uint32_t>(base + 1),
                                    static_cast<std::uint32_t>(base + 2), static_cast<std::uint32_t>(base + 3)));
            rng.advance(offset);
            std::array<bool, 4> matches = { true, true, true, true };
            std::array<std::uint32_t, 4> shifts {};
            std::array<std::uint32_t, 4> corrections {};
            for (std::uint32_t needleIndex = 0; needleIndex < needleCount; needleIndex++)
            {
                const auto generated = rng.nextNeedles();
                for (int lane = 0; lane < 4; lane++)
                {
                    if (!matches[lane]) continue;
                    if (fuzzy != 0 && needleIndex == 0)
                    {
                        shifts[lane] = (generated[lane] + 17 - needles[0]) % 17;
                        corrections[lane] = (17 - shifts[lane]) % 17;
                        matches[lane] = allowedFuzzyShift(shifts[lane]);
                    }
                    const auto expected = fuzzy == 0 ? needles[needleIndex]
                                                     : (needles[needleIndex] + shifts[lane]) % 17;
                    if (generated[lane] != expected) matches[lane] = false;
                }
            }
            for (int lane = 0; lane < 4; lane++)
            {
                const auto seedValue = base + static_cast<std::uint64_t>(lane);
                if (seedValue < rangeEnd && matches[lane])
                    seedResults.push_back({ static_cast<std::uint32_t>(seedValue), corrections[lane] });
            }
        }
        return static_cast<std::uint32_t>(seedResults.size());
    }

    POKERNGKIT_KEEPALIVE const Gen7MainSeedResult *gen7main_seed_result_ptr()
    {
        return seedResults.empty() ? nullptr : seedResults.data();
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7main_seed_result_count()
    {
        return static_cast<std::uint32_t>(seedResults.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7main_qr_search(std::uint32_t seed,
                                                          std::uint32_t minimumFrame,
                                                          std::uint32_t maximumFrameValue,
                                                          const std::uint32_t *needles,
                                                          std::uint32_t needleCount)
    {
        qrResults.clear();
        lastError = None;
        if (needles == nullptr || needleCount < 2 || needleCount > 64 || minimumFrame > maximumFrameValue ||
            maximumFrameValue > maximumFrame)
        {
            lastError = InvalidInput;
            return 0;
        }
        for (std::uint32_t i = 0; i < needleCount; i++)
        {
            if (needles[i] > 16)
            {
                lastError = InvalidInput;
                return 0;
            }
        }

        SFMT rng(seed);
        rng.advance(minimumFrame);
        std::vector<std::uint32_t> buffer(needleCount);
        for (auto &value : buffer) value = static_cast<std::uint32_t>(rng.nextUlong() % 17);
        std::uint32_t head = 0;
        for (std::uint32_t frame = minimumFrame; frame <= maximumFrameValue; frame++)
        {
            std::uint32_t index = 0;
            for (; index < needleCount; index++)
            {
                if (buffer[(index + head) % needleCount] != needles[index]) break;
            }
            if (index == needleCount)
            {
                qrResults.push_back({ frame + needleCount - 1, frame + needleCount + 1 });
            }
            buffer[head++] = static_cast<std::uint32_t>(rng.nextUlong() % 17);
            if (head == needleCount) head = 0;
            if (frame == maximumFrameValue) break;
        }
        return static_cast<std::uint32_t>(qrResults.size());
    }

    POKERNGKIT_KEEPALIVE const Gen7MainQrResult *gen7main_qr_result_ptr()
    {
        return qrResults.empty() ? nullptr : qrResults.data();
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7main_qr_result_count()
    {
        return static_cast<std::uint32_t>(qrResults.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7main_calculate_time(std::uint32_t seed,
                                                               std::uint32_t startingFrame,
                                                               std::uint32_t targetFrame,
                                                               std::uint32_t npc,
                                                               std::uint32_t fidget,
                                                               std::uint32_t raining)
    {
        lastError = None;
        primaryTime = 0;
        secondaryTime = 0;
        if (startingFrame > maximumFrame || targetFrame > maximumFrame || npc > 50 || fidget > 1 || raining > 1)
        {
            lastError = InvalidInput;
            return 0;
        }
        const auto result = calculateTime(seed, static_cast<std::int32_t>(startingFrame),
                                          static_cast<std::int32_t>(targetFrame), npc + 1, fidget != 0,
                                          raining != 0);
        primaryTime = result.first;
        secondaryTime = result.second;
        return 1;
    }

    POKERNGKIT_KEEPALIVE std::int32_t gen7main_time_primary() { return primaryTime; }
    POKERNGKIT_KEEPALIVE std::int32_t gen7main_time_secondary() { return secondaryTime; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7main_last_error() { return lastError; }
}

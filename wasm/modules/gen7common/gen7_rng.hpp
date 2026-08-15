/*
 * PokeRNGKit shared Gen VII RNG primitives
 * Copyright (C) 2026 Hakuhiro
 *
 * SFMT and model-status behavior are adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including its SFMT implementation by Rei HOBARA.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN7_COMMON_RNG_HPP
#define POKERNGKIT_GEN7_COMMON_RNG_HPP

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <deque>
#include <utility>
#include <vector>

namespace pokerngkit::gen7
{
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

        void advanceUint(std::uint32_t count)
        {
            for (std::uint32_t i = 0; i < count; i++) nextUint();
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

        void advance(std::int32_t count)
        {
            cursor += count;
            if (cursor < -1) cursor = -1;
        }

        std::uint32_t index() const { return static_cast<std::uint32_t>(cursor + 1); }

        void rewind(std::uint32_t value) { cursor = static_cast<std::int64_t>(value) - 1; }

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

    inline std::vector<std::uint8_t> noNpcBlinkFlags(std::uint32_t seed, std::uint32_t minFrame,
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

    inline bool blinkCheckAfter(const std::deque<std::uint64_t> &values)
    {
        for (std::size_t i = 1; i + 1 < values.size(); i++)
        {
            if ((values[i] & 0x7f) == 0) return true;
        }
        return values.back() % 3 == 0;
    }

    inline std::vector<std::uint8_t> multipleNpcBlinkFlags(std::uint32_t seed, std::uint32_t minFrame,
                                                            std::uint32_t maxFrame,
                                                            std::uint32_t modelNumber)
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

    inline std::vector<std::uint8_t> createBlinkFlags(std::uint32_t seed, std::uint32_t minFrame,
                                                       std::uint32_t maxFrame, std::uint32_t npc)
    {
        const auto modelNumber = npc + 1;
        return modelNumber == 1 ? noNpcBlinkFlags(seed, minFrame, maxFrame)
                                : multipleNpcBlinkFlags(seed, minFrame, maxFrame, modelNumber);
    }

    inline std::uint32_t hiddenPower(const std::array<int, 6> &ivs)
    {
        constexpr std::array<int, 6> order = { 0, 1, 2, 4, 5, 3 };
        int value = 0;
        for (int i = 0; i < 6; i++) value += (ivs[i] & 1) << order[i];
        return static_cast<std::uint32_t>(15 * value / 63);
    }

    inline std::uint32_t psv(std::uint32_t pid) { return ((pid >> 16) ^ (pid & 0xffff)) >> 4; }
    inline std::uint32_t prv(std::uint32_t pid) { return ((pid >> 16) ^ (pid & 0xffff)) & 0xf; }
}

#endif

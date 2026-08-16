/*
 * PokeRNGKit Gen VII Battle Tree WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Battle Tree behavior is adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including its SFMT implementation by Rei HOBARA.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7battletree_bridge.h"

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

        explicit ModelSnapshot(std::uint32_t modelNumber) : modelNumber(modelNumber), remain(modelNumber) {}
    };

    class ModelStatus
    {
      public:
        ModelStatus(std::uint32_t modelNumber, SFMT rng) : rng(std::move(rng)), snapshot(modelNumber) {}

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
                    if (++snapshot.remain[i] == 0) snapshot.remain[i] = next(count) % 3 == 0 ? 36 : 30;
                    continue;
                }
                if ((next(count) & 0x7f) == 0) snapshot.remain[i] = -5;
            }
            return count;
        }

        ModelSnapshot copy() const { return snapshot; }

      private:
        SFMT rng;
        ModelSnapshot snapshot;

        std::uint64_t next(int &count)
        {
            count++;
            return rng.nextUlong();
        }
    };

    class BattleTreeContext
    {
      public:
        BattleTreeContext(Lookahead &stream, const ModelSnapshot &snapshot)
            : stream(stream), modelNumber(snapshot.modelNumber), remain(snapshot.remain)
        {
        }

        std::uint32_t prepare(std::uint32_t delay)
        {
            timeElapse(static_cast<int>(delay / 2));
            modelNumber = 2;
            remain.assign(modelNumber, 0);
            timeElapse(2);
            return stream.index();
        }

        std::uint64_t next() { return stream.next(); }

      private:
        Lookahead &stream;
        std::uint32_t modelNumber;
        std::vector<int> remain;

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
    };

    std::vector<std::uint8_t> noNpcBlinkFlags(std::uint32_t seed, std::uint32_t minFrame,
                                               std::uint32_t maxFrame)
    {
        std::vector<std::uint8_t> flags(maxFrame - minFrame + 2);
        SFMT rng(seed);
        int blinkFlag = 0;
        for (std::uint32_t i = 0; i < minFrame - std::min(minFrame, 2U); i++) rng.nextUlong();
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

    std::vector<std::uint8_t> createBlinkFlags(const Gen7BattleTreePackedRequest &request)
    {
        const auto modelNumber = request.npc + 1;
        return modelNumber == 1
                   ? noNpcBlinkFlags(request.seed, request.minFrame, request.maxFrame)
                   : multipleNpcBlinkFlags(request.seed, request.minFrame, request.maxFrame, modelNumber);
    }

    std::uint32_t generateTrainer(std::uint64_t random, std::uint32_t version, std::uint32_t streak)
    {
        constexpr std::array<std::array<std::uint8_t, 9>, 4> trainerLists = {
            std::array<std::uint8_t, 9> { 197, 201, 199, 192, 194, 195, 196, 193, 0 },
            std::array<std::uint8_t, 9> { 198, 202, 200, 192, 194, 195, 196, 193, 0 },
            std::array<std::uint8_t, 9> { 197, 201, 199, 192, 194, 195, 196, 205, 193 },
            std::array<std::uint8_t, 9> { 198, 202, 200, 192, 194, 195, 196, 205, 193 },
        };
        if (streak % 10 == 0)
        {
            int selection = static_cast<int>(random % (version > 1 ? 114U : 100U));
            std::size_t index = 0;
            while ((selection -= 14) >= 0) index++;
            return trainerLists[version][index];
        }

        std::uint32_t size;
        std::uint32_t offset;
        if (streak <= 10)
        {
            size = 50;
            offset = 0;
        }
        else if (streak <= 50)
        {
            size = 40;
            offset = ((streak - 1) / 10) * 20 + 10;
        }
        else
        {
            size = 100;
            offset = 90;
        }
        return offset + static_cast<std::uint32_t>(random % size);
    }

    bool validRequest(const Gen7BattleTreePackedRequest &request)
    {
        return request.version <= 3 && request.minFrame <= request.maxFrame &&
               request.maxFrame <= browserMaximumFrame && request.npc <= 100 && request.delay <= 10000 &&
               request.streak >= 1 && request.streak <= 10000 && request.trainerFilter <= 254 &&
               request.resultLimit >= 1 && request.resultLimit <= maximumResults;
    }

    class Session
    {
      public:
        explicit Session(const Gen7BattleTreePackedRequest &request)
            : request(request), blinkFlags(createBlinkFlags(request)), stream(makeStartingRng(request.seed, request.minFrame)),
              status(request.npc + 1, makeStartingRng(request.seed, request.minFrame)),
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

                const auto random = stream.current();
                BattleTreeContext context(stream, generationStatus);
                const auto frameUsed = context.prepare(request.delay);
                const auto trainerId = generateTrainer(context.next(), request.version, request.streak);
                const auto blink = blinkFlags[currentFrame - request.minFrame];
                stream.advanceBase();
                frameAdvance--;
                stepProcessed++;
                totalProcessed++;

                if (request.trainerFilter >= 209 || request.trainerFilter == trainerId)
                {
                    results.push_back({
                        currentFrame,
                        currentFrame + frameUsed,
                        frameTime * 2,
                        static_cast<std::uint32_t>(random),
                        static_cast<std::uint32_t>(random >> 32),
                        trainerId,
                        blink,
                    });
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

        Gen7BattleTreePackedRequest request;
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
        std::vector<Gen7BattleTreePackedResult> results;

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

static_assert(sizeof(Gen7BattleTreePackedRequest) == 9 * sizeof(std::uint32_t));
static_assert(sizeof(Gen7BattleTreePackedResult) == 7 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7battletree_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7battletree_begin(const Gen7BattleTreePackedRequest *request)
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

    POKERNGKIT_KEEPALIVE std::uint32_t gen7battletree_step(std::uint32_t maximumStates)
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

    POKERNGKIT_KEEPALIVE std::uintptr_t gen7battletree_result_ptr()
    {
        return session ? reinterpret_cast<std::uintptr_t>(session->results.data()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7battletree_result_count()
    {
        return session ? static_cast<std::uint32_t>(session->results.size()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7battletree_step_processed()
    {
        return session ? session->stepProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7battletree_total_processed()
    {
        return session ? session->totalProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7battletree_total_results()
    {
        return session ? session->totalResults : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7battletree_done()
    {
        return session && session->isDone() ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7battletree_limit_reached()
    {
        return session && session->resultLimitReached ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7battletree_last_error() { return lastError; }
}

/*
 * PokeRNGKit Gen VII Festival Plaza WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Festival Plaza behavior is adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including FPFacility, RNGPool and MiscRNGTool.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7festivalplaza_bridge.h"

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
    using pokerngkit::gen7::TinyMT;

    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint32_t browserMaximumFrame = 5000000;
    constexpr std::uint32_t maximumResults = 100000;
    constexpr std::uint32_t maximumStepStates = 65536;
    constexpr std::uint32_t anyFilter = 0xffffffffU;
    constexpr std::uint32_t baseResultWords = 10;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        SessionMissing = 2,
        InvalidStep = 3,
    };

    struct FacilityResult
    {
        std::uint32_t star;
        std::uint32_t facility;
        std::uint32_t npcType;
        std::uint32_t color;
    };

    constexpr std::array<std::array<std::uint8_t, 5>, 19> starChance = {
        std::array<std::uint8_t, 5> { 100, 0, 0, 0, 0 },
        std::array<std::uint8_t, 5> { 75, 19, 6, 0, 0 },
        std::array<std::uint8_t, 5> { 75, 17, 8, 0, 0 },
        std::array<std::uint8_t, 5> { 75, 15, 10, 0, 0 },
        std::array<std::uint8_t, 5> { 50, 38, 12, 0, 0 },
        std::array<std::uint8_t, 5> { 50, 36, 14, 0, 0 },
        std::array<std::uint8_t, 5> { 50, 34, 16, 0, 0 },
        std::array<std::uint8_t, 5> { 50, 32, 18, 0, 0 },
        std::array<std::uint8_t, 5> { 40, 35, 20, 5, 0 },
        std::array<std::uint8_t, 5> { 30, 40, 22, 7, 1 },
        std::array<std::uint8_t, 5> { 25, 40, 24, 9, 2 },
        std::array<std::uint8_t, 5> { 20, 35, 31, 11, 3 },
        std::array<std::uint8_t, 5> { 15, 30, 38, 13, 4 },
        std::array<std::uint8_t, 5> { 10, 25, 45, 15, 5 },
        std::array<std::uint8_t, 5> { 10, 20, 47, 17, 6 },
        std::array<std::uint8_t, 5> { 10, 15, 49, 19, 7 },
        std::array<std::uint8_t, 5> { 10, 15, 46, 21, 8 },
        std::array<std::uint8_t, 5> { 10, 15, 43, 23, 9 },
        std::array<std::uint8_t, 5> { 10, 15, 40, 25, 10 },
    };

    constexpr std::array<std::uint8_t, 27> sunStar1 = {
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 21, 23, 24, 25, 27, 29, 31, 33,
    };
    constexpr std::array<std::uint8_t, 27> moonStar1 = {
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 32, 33,
    };
    constexpr std::array<std::uint8_t, 10> sunStar2 = { 3, 4, 5, 7, 9, 10, 14, 16, 17, 33 };
    constexpr std::array<std::uint8_t, 9> moonStar2 = { 0, 1, 2, 6, 8, 11, 13, 15, 33 };
    constexpr std::array<std::uint8_t, 17> sunStar3 = {
        0, 1, 2, 9, 10, 11, 12, 14, 16, 19, 21, 23, 25, 27, 29, 31, 33,
    };
    constexpr std::array<std::uint8_t, 18> moonStar3 = {
        3, 4, 5, 6, 7, 8, 13, 15, 17, 18, 20, 22, 24, 26, 28, 30, 32, 33,
    };
    constexpr std::array<std::uint8_t, 7> sunStar4 = { 3, 4, 5, 7, 14, 16, 17 };
    constexpr std::array<std::uint8_t, 6> moonStar4 = { 0, 1, 2, 11, 13, 15 };
    constexpr std::array<std::uint8_t, 14> sunStar5 = { 0, 1, 2, 11, 14, 16, 19, 21, 23, 24, 25, 27, 29, 31 };
    constexpr std::array<std::uint8_t, 15> moonStar5 = { 3, 4, 5, 7, 13, 15, 17, 18, 20, 22, 24, 26, 28, 30, 32 };

    struct FacilityPool
    {
        const std::uint8_t *data;
        std::size_t size;
    };

    FacilityPool facilityPool(std::uint32_t version, std::uint32_t star)
    {
        const bool moon = version == 1 || version == 3;
        switch (star)
        {
            case 1:
                return moon ? FacilityPool { moonStar1.data(), moonStar1.size() }
                            : FacilityPool { sunStar1.data(), sunStar1.size() };
            case 2:
                return moon ? FacilityPool { moonStar2.data(), moonStar2.size() }
                            : FacilityPool { sunStar2.data(), sunStar2.size() };
            case 3:
                return moon ? FacilityPool { moonStar3.data(), moonStar3.size() }
                            : FacilityPool { sunStar3.data(), sunStar3.size() };
            case 4:
                return moon ? FacilityPool { moonStar4.data(), moonStar4.size() }
                            : FacilityPool { sunStar4.data(), sunStar4.size() };
            default:
                return moon ? FacilityPool { moonStar5.data(), moonStar5.size() }
                            : FacilityPool { sunStar5.data(), sunStar5.size() };
        }
    }

    std::uint32_t generateStar(TinyMT &rng, std::uint32_t rank)
    {
        int random = static_cast<int>(rng.nextUint() % 100);
        for (std::uint32_t star = 1; star < 5; star++)
        {
            random -= starChance[rank][star - 1];
            if (random < 0) return star;
        }
        return 5;
    }

    std::uint32_t generateColor(TinyMT &rng)
    {
        const auto random = rng.nextUint() % 100;
        if (random < 5) return 3;
        if (random < 20) return 2;
        if (random < 50) return 1;
        return 0;
    }

    FacilityResult generateFacility(std::uint64_t random, std::uint32_t version, std::uint32_t rank)
    {
        TinyMT rng(static_cast<std::uint32_t>(random));
        const auto star = generateStar(rng, rank);
        const auto pool = facilityPool(version, star);
        const auto size = pool.size - (version < 2 && star <= 3 ? 1 : 0);
        return {
            star,
            pool.data[rng.nextUint() % size],
            rng.nextUint() % 12,
            generateColor(rng),
        };
    }

    class FestivalContext
    {
      public:
        FestivalContext(Lookahead &stream, const ModelSnapshot &snapshot)
            : stream(stream), modelNumber(snapshot.modelNumber), remain(snapshot.remain)
        {
        }

        std::uint32_t prepare(std::uint32_t delay)
        {
            timeElapse(static_cast<int>(delay / 2));
            return stream.index();
        }

      private:
        Lookahead &stream;
        std::uint32_t modelNumber;
        std::vector<int> remain;

        std::uint64_t next() { return stream.next(); }

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

    bool validOptionalFilter(std::uint32_t value, std::uint32_t maximum)
    {
        return value == anyFilter || value <= maximum;
    }

    bool validRequest(const Gen7FestivalPlazaPackedRequest &request)
    {
        return request.version <= 3 && request.minFrame <= request.maxFrame &&
               request.maxFrame <= browserMaximumFrame && request.npc <= 100 && request.delay <= 10000 &&
               request.rank <= 18 && request.starFilter <= 5 && validOptionalFilter(request.facilityFilter, 33) &&
               validOptionalFilter(request.npcTypeFilter, 11) && validOptionalFilter(request.colorFilter, 3) &&
               request.includeNpcStatus <= 1 && request.resultLimit >= 1 && request.resultLimit <= maximumResults;
    }

    bool matches(const Gen7FestivalPlazaPackedRequest &request, const FacilityResult &result)
    {
        return (request.starFilter == 0 || request.starFilter == result.star) &&
               (request.facilityFilter == anyFilter || request.facilityFilter == result.facility) &&
               (request.npcTypeFilter == anyFilter || request.npcTypeFilter == result.npcType) &&
               (request.colorFilter == anyFilter || request.colorFilter == result.color);
    }

    class Session
    {
      public:
        explicit Session(const Gen7FestivalPlazaPackedRequest &request)
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
            resultCount = 0;
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
                FestivalContext context(stream, generationStatus);
                const auto frameUsed = context.prepare(request.delay);
                const auto generated = generateFacility(random, request.version, request.rank);
                const auto blink = blinkFlags[currentFrame - request.minFrame];
                stream.advanceBase();
                frameAdvance--;
                stepProcessed++;
                totalProcessed++;

                if (matches(request, generated))
                {
                    appendResult(random, generated, frameUsed, blink);
                    resultCount++;
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
            return resultCount;
        }

        bool isDone() const { return currentFrame > request.maxFrame || totalResults >= request.resultLimit; }

        Gen7FestivalPlazaPackedRequest request;
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
        std::uint32_t resultCount = 0;
        bool resultLimitReached = false;
        std::vector<std::uint32_t> results;

      private:
        void appendResult(std::uint64_t random, const FacilityResult &facility, std::uint32_t frameUsed,
                          std::uint32_t blink)
        {
            results.reserve(results.size() + baseResultWords + (request.includeNpcStatus ? request.npc + 1 : 0));
            results.insert(results.end(), {
                                              currentFrame,
                                              currentFrame + frameUsed,
                                              frameTime * 2,
                                              static_cast<std::uint32_t>(random),
                                              static_cast<std::uint32_t>(random >> 32),
                                              facility.star,
                                              facility.facility,
                                              facility.npcType,
                                              facility.color,
                                              blink,
                                          });
            if (request.includeNpcStatus != 0)
            {
                for (const auto value : generationStatus.remain)
                    results.push_back(static_cast<std::uint32_t>(value));
            }
        }

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

static_assert(sizeof(Gen7FestivalPlazaPackedRequest) == 13 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7festivalplaza_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t
    gen7festivalplaza_begin(const Gen7FestivalPlazaPackedRequest *request)
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

    POKERNGKIT_KEEPALIVE std::uint32_t gen7festivalplaza_step(std::uint32_t maximumStates)
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

    POKERNGKIT_KEEPALIVE std::uintptr_t gen7festivalplaza_result_ptr()
    {
        return session ? reinterpret_cast<std::uintptr_t>(session->results.data()) : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7festivalplaza_result_count()
    {
        return session ? session->resultCount : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7festivalplaza_step_processed()
    {
        return session ? session->stepProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7festivalplaza_total_processed()
    {
        return session ? session->totalProcessed : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7festivalplaza_total_results()
    {
        return session ? session->totalResults : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7festivalplaza_done()
    {
        return session && session->isDone() ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7festivalplaza_limit_reached()
    {
        return session && session->resultLimitReached ? 1 : 0;
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7festivalplaza_last_error() { return lastError; }
}

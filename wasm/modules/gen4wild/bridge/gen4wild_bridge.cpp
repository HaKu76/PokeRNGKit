/* PokeRNGKit Gen IV Wild WebAssembly bridge. PokeFinder source is GPL-3.0-or-later. */
#include "gen4wild_bridge.h"
#include "../../../shared/perfect_iv_combinations.hpp"
#include <Core/Enum/Encounter.hpp>
#include <Core/Enum/Game.hpp>
#include <Core/Enum/Lead.hpp>
#include <Core/Enum/Method.hpp>
#include <Core/Gen4/EncounterArea4.hpp>
#include <Core/Gen4/Generators/WildGenerator4.hpp>
#include <Core/Gen4/Profile4.hpp>
#include <Core/Gen4/Searchers/WildSearcher4.hpp>
#include <Core/Gen4/States/WildState4.hpp>
#include <Core/Parents/Filters/StateFilter.hpp>
#include <Core/Parents/PersonalInfo.hpp>
#include <Core/Parents/Slot.hpp>
#include <algorithm>
#include <array>
#include <cstdint>
#include <string>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define KEEP EMSCRIPTEN_KEEPALIVE
#else
#define KEEP
#endif

namespace {
constexpr std::uint32_t apiVersion = 2;
constexpr std::size_t maxResults = 250000;
static_assert(sizeof(Gen4WildPackedSlot) == 19 * sizeof(std::uint32_t));
static_assert(sizeof(Gen4WildPackedState) == 22 * sizeof(std::uint32_t));
static_assert(sizeof(Gen4WildPackedSearcherState) == 22 * sizeof(std::uint32_t));
#ifdef __EMSCRIPTEN__
static_assert(sizeof(Gen4WildPackedRequest) == 77 * sizeof(std::uint32_t));
#endif
thread_local std::vector<Gen4WildPackedState> generated;
thread_local std::vector<Gen4WildPackedSearcherState> searched;
thread_local bool searchActive = false;
thread_local std::uint32_t lastError = 0;

Game gameFromValue(std::uint32_t value)
{
    return static_cast<Game>(value);
}

Method methodFromRequest(const Gen4WildPackedRequest &request)
{
    if (request.encounter == static_cast<std::uint32_t>(Encounter::HoneyTree)) return Method::HoneyTree;
    if (request.method == 4) return Method::PokeRadar;
    return request.method == 3 ? Method::MethodK : Method::MethodJ;
}

std::array<bool, 25> natures(std::uint32_t mask)
{
    std::array<bool, 25> values {};
    for (std::size_t index = 0; index < values.size(); index++) values[index] = (mask & (1u << index)) != 0;
    return values;
}

std::array<bool, 16> powers(std::uint32_t mask)
{
    std::array<bool, 16> values {};
    for (std::size_t index = 0; index < values.size(); index++) values[index] = (mask & (1u << index)) != 0;
    return values;
}

std::array<bool, 12> slotFlags(std::uint32_t mask)
{
    std::array<bool, 12> values {};
    for (std::size_t index = 0; index < values.size(); index++) values[index] = (mask & (1u << index)) != 0;
    return values;
}

std::array<bool, 26> unownDiscovered(const Gen4WildPackedRequest &request)
{
    std::array<bool, 26> values {};
    for (std::size_t index = 0; index < values.size(); index++) values[index] = request.unownDiscovered[index] != 0;
    return values;
}

std::array<bool, 4> unownPuzzle(const Gen4WildPackedRequest &request)
{
    std::array<bool, 4> values {};
    for (std::size_t index = 0; index < values.size(); index++) values[index] = request.unownPuzzle[index] != 0;
    return values;
}

std::uint8_t filterGender(const Gen4WildPackedRequest &request) { return request.genderFilter == 0 ? 255 : static_cast<std::uint8_t>(request.genderFilter - 1); }
std::uint8_t filterAbility(const Gen4WildPackedRequest &request) { return request.abilityFilter == 0 ? 255 : static_cast<std::uint8_t>(request.abilityFilter - 1); }
std::uint8_t filterShiny(const Gen4WildPackedRequest &request) { return request.shinyFilter == 2 ? 3 : 255; }

bool postFilter(const Gen4WildPackedRequest &request, std::uint8_t shiny, std::uint8_t level, std::uint8_t slot)
{
    if (level < request.levelMin || level > request.levelMax) return false;
    if ((request.encounterSlotMask & (1u << slot)) == 0) return false;
    if (request.shinyFilter == 1 && shiny != 0) return false;
    return true;
}

template <typename Ivs>
bool matchesPerfectIvs(const Gen4WildPackedRequest &request, const Ivs &ivs)
{
    return static_cast<std::uint32_t>(std::count_if(ivs.begin(), ivs.end(), [&request](std::uint8_t iv) {
        return iv >= request.perfectIvValue;
    })) >= request.perfectIvCount;
}

struct EncounterContext {
    std::array<Slot, 12> slots;
    std::vector<PersonalInfo> personal;
    EncounterArea4 area;
    Profile4 profile;
    WildStateFilter filter;

    explicit EncounterContext(const Gen4WildPackedRequest &request) :
        personal(),
        area(0, 0, Encounter::Grass, slots),
        profile("PokeRNGKit", gameFromValue(request.game), static_cast<u16>(request.tid), static_cast<u16>(request.sid), request.nationalDex != 0),
        filter(255, 255, 255, 0, 255, 0, 255, false, {}, {}, {}, {}, {})
    {
        personal.reserve(request.slotCount);
        slots.fill(Slot {});
        for (std::size_t index = 0; index < request.slotCount && index < slots.size(); index++)
        {
            const auto &packed = request.slots[index];
            personal.emplace_back(
                std::array<u8, 6> { static_cast<u8>(packed.stats[0]), static_cast<u8>(packed.stats[1]), static_cast<u8>(packed.stats[2]), static_cast<u8>(packed.stats[3]), static_cast<u8>(packed.stats[4]), static_cast<u8>(packed.stats[5]) },
                std::array<u8, 2> { static_cast<u8>(packed.types[0]), static_cast<u8>(packed.types[1]) },
                std::array<u16, 3> { static_cast<u16>(packed.items[0]), static_cast<u16>(packed.items[1]), static_cast<u16>(packed.items[2]) },
                static_cast<u8>(packed.genderRatio),
                std::array<u16, 3> { static_cast<u16>(packed.abilities[0]), static_cast<u16>(packed.abilities[1]), static_cast<u16>(packed.abilities[2]) },
                1, 0, static_cast<u16>(packed.species), true);
            slots[index] = Slot(static_cast<u16>(packed.species), static_cast<u8>(packed.form), static_cast<u8>(packed.minLevel), static_cast<u8>(packed.maxLevel), &personal.back());
        }
        area = EncounterArea4(static_cast<u8>(request.location), static_cast<u8>(request.rate), static_cast<Encounter>(request.encounter), slots);
        profile = Profile4("PokeRNGKit", gameFromValue(request.game), static_cast<u16>(request.tid), static_cast<u16>(request.sid), request.nationalDex != 0, unownDiscovered(request), unownPuzzle(request));
        filter = WildStateFilter(filterGender(request), filterAbility(request), filterShiny(request), 0, 255, 0, 255, false,
                                 { static_cast<u8>(request.ivMin[0]), static_cast<u8>(request.ivMin[1]), static_cast<u8>(request.ivMin[2]), static_cast<u8>(request.ivMin[3]), static_cast<u8>(request.ivMin[4]), static_cast<u8>(request.ivMin[5]) },
                                 { static_cast<u8>(request.ivMax[0]), static_cast<u8>(request.ivMax[1]), static_cast<u8>(request.ivMax[2]), static_cast<u8>(request.ivMax[3]), static_cast<u8>(request.ivMax[4]), static_cast<u8>(request.ivMax[5]) },
                                 natures(request.natureMask), powers(request.hiddenPowerMask), slotFlags(request.encounterSlotMask));
    }
};

void append(const Gen4WildPackedRequest &request, const WildGeneratorState4 &state)
{
    const auto ivs = state.getIVs();
    if (!postFilter(request, state.getShiny(), state.getLevel(), state.getEncounterSlot())
        || !matchesPerfectIvs(request, ivs) || generated.size() >= maxResults) return;
    generated.push_back({ state.getAdvances(), state.getBattleAdvances(), state.getPID(),
                          { ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5] }, state.getAbility(), state.getGender(), state.getLevel(),
                          state.getNature(), state.getShiny(), state.getEncounterSlot(), state.getSpecie(), state.getForm(), state.getItem(),
                          state.getHiddenPower(), state.getHiddenPowerStrength(), state.getCall(), state.getChatot() });
}

void append(const Gen4WildPackedRequest &request, const WildSearcherState4 &state)
{
    const auto ivs = state.getIVs();
    if (!postFilter(request, state.getShiny(), state.getLevel(), state.getEncounterSlot())
        || !matchesPerfectIvs(request, ivs) || searched.size() >= maxResults) return;
    const auto seed = state.getSeed();
    searched.push_back({ seed, seed & 0xffff, (seed >> 16) & 0xff, state.getAdvances(), state.getPID(),
                         { ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5] }, state.getAbility(), state.getGender(), state.getLevel(),
                         state.getNature(), state.getShiny(), state.getEncounterSlot(), state.getSpecie(), state.getForm(), state.getItem(),
                         state.getHiddenPower(), state.getHiddenPowerStrength() });
}
}

extern "C" {
KEEP std::uint32_t gen4wild_api_version() { return apiVersion; }

KEEP std::uint32_t gen4wild_generate(const Gen4WildPackedRequest *request)
{
    generated.clear(); searched.clear(); searchActive = false; lastError = 0;
    if (!request || !request->slots || request->slotCount == 0 || request->slotCount > 12 || request->fixedSlot >= request->slotCount
        || request->perfectIvValue > 31 || request->perfectIvCount > 6) { lastError = 1; return 0; }
    EncounterContext context(*request);
    const auto method = methodFromRequest(*request);
    WildGenerator4 generator(request->initialAdvances, request->maxAdvances, request->offset, method,
                             static_cast<Lead>(request->lead), request->feebasTile != 0, request->radarShiny != 0,
                             request->unownRadio != 0, static_cast<u8>(request->happiness), context.area, context.profile, context.filter);
    for (const auto &state : generator.generate(request->seed, static_cast<u8>(request->fixedSlot))) append(*request, state);
    return static_cast<std::uint32_t>(generated.size());
}

KEEP std::uint32_t gen4wild_search(const Gen4WildPackedRequest *request, std::uint32_t startIndex, std::uint32_t stateCount)
{
    generated.clear(); searched.clear(); searchActive = true; lastError = 0;
    if (!request || !request->slots || request->slotCount == 0 || request->slotCount > 12 || stateCount == 0 || request->fixedSlot >= request->slotCount
        || request->perfectIvValue > 31 || request->perfectIvCount > 6) { lastError = 1; return 0; }
    EncounterContext context(*request);
    WildSearcher4 searcher(request->minAdvance, request->maxAdvance, request->minDelay, request->maxDelay, methodFromRequest(*request),
                           static_cast<Lead>(request->lead), request->feebasTile != 0, request->radarShiny != 0,
                           request->unownRadio != 0, static_cast<u8>(request->happiness), context.area, context.profile, context.filter);
    const pokerngkit::IvBounds minimum { request->ivMin[0], request->ivMin[1], request->ivMin[2], request->ivMin[3], request->ivMin[4], request->ivMin[5] };
    const pokerngkit::IvBounds maximum { request->ivMax[0], request->ivMax[1], request->ivMax[2], request->ivMax[3], request->ivMax[4], request->ivMax[5] };
    const auto total = pokerngkit::countIvCombinations(
        minimum, maximum, request->perfectIvValue, request->perfectIvCount);
    if (static_cast<std::uint64_t>(startIndex) + stateCount > total) { lastError = 1; return 0; }
    // The upstream searcher accepts one complete IV range. Slice the requested range locally so Worker chunks remain independent.
    std::uint64_t index = startIndex;
    for (std::uint32_t count = 0; count < stateCount; count++, index++)
    {
        const auto ivs = pokerngkit::ivCombinationAtIndex(
            index, minimum, maximum, request->perfectIvValue, request->perfectIvCount);
        if (!matchesPerfectIvs(*request, ivs)) continue;
        searcher.startSearch(ivs, ivs, static_cast<u8>(request->fixedSlot));
        for (const auto &state : searcher.getResults()) append(*request, state);
    }
    return static_cast<std::uint32_t>(searched.size());
}

KEEP std::uintptr_t gen4wild_result_ptr() { return searchActive ? reinterpret_cast<std::uintptr_t>(searched.data()) : reinterpret_cast<std::uintptr_t>(generated.data()); }
KEEP std::uint32_t gen4wild_result_count() { return searchActive ? static_cast<std::uint32_t>(searched.size()) : static_cast<std::uint32_t>(generated.size()); }
KEEP std::uint32_t gen4wild_last_error() { return lastError; }
}

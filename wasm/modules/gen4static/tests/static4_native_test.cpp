#include "gen4static_bridge.h"

#include <array>
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <cstdint>

#undef assert
#define assert(condition)                                                                            \
    do                                                                                               \
    {                                                                                                \
        if (!(condition))                                                                            \
        {                                                                                            \
            std::fprintf(stderr, "Assertion failed: %s (%s:%d)\n", #condition, __FILE__, __LINE__); \
            std::exit(EXIT_FAILURE);                                                                 \
        }                                                                                            \
    } while (false)

namespace
{
    constexpr std::uint32_t allNatures = 0x1ffffff;
    constexpr std::uint32_t allHiddenPowers = 0xffff;

    struct Encounter
    {
        std::uint32_t species;
        std::uint32_t level;
        std::uint32_t genderRatio;
        std::uint32_t shinyLock;
    };

    std::uint32_t generate(std::uint32_t seed, std::uint32_t method, std::uint32_t lead,
                           std::uint32_t syncNature, const Encounter &encounter)
    {
        return gen4static_generate(seed, 0, 9, 0, method, lead, syncNature, encounter.species,
                                   encounter.level, encounter.genderRatio, encounter.shinyLock, 12345, 54321,
                                   Gen4ShinyAny, Gen4GenderAny, Gen4AbilityAny, allNatures, allHiddenPowers,
                                   0, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31);
    }

    std::uint32_t search(std::uint32_t method, std::uint32_t lead, const Encounter &encounter)
    {
        return gen4static_search(0, 1, 0, 1000, 600, 2000, method, lead, 0, encounter.species,
                                 encounter.level, encounter.genderRatio, encounter.shinyLock, 12345, 54321,
                                 Gen4ShinyAny, Gen4GenderAny, Gen4AbilityAny, allNatures, allHiddenPowers,
                                 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31);
    }

    void checkFirst(const Gen4StaticPackedState &state, std::uint32_t pid,
                    const std::array<std::uint32_t, 6> &ivs, std::uint32_t nature,
                    std::uint32_t hiddenPower, std::uint32_t power, std::uint32_t call,
                    std::uint32_t chatot)
    {
        if (state.hp != ivs[0] || state.attack != ivs[1] || state.defense != ivs[2]
            || state.specialAttack != ivs[3] || state.specialDefense != ivs[4] || state.speed != ivs[5])
        {
            std::fprintf(stderr, "PID %u IVs actual %u/%u/%u/%u/%u/%u expected %u/%u/%u/%u/%u/%u\n",
                         pid, state.hp, state.attack, state.defense, state.specialAttack, state.specialDefense,
                         state.speed, ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5]);
        }
        assert(state.advances == 0);
        assert(state.pid == pid);
        assert(state.hp == ivs[0]);
        assert(state.attack == ivs[1]);
        assert(state.defense == ivs[2]);
        assert(state.specialAttack == ivs[3]);
        assert(state.specialDefense == ivs[4]);
        assert(state.speed == ivs[5]);
        assert(state.nature == nature);
        assert(state.hiddenPower == hiddenPower);
        assert(state.hiddenPowerStrength == power);
        assert(state.call == call);
        assert(state.chatot == chatot);
    }
}

int main()
{
    assert(gen4static_api_version() == 1);

    const Encounter manaphy = { 490, 1, 255, Gen4ShinyNever };
    assert(generate(0, Gen4Method1, Gen4LeadNone, 0, manaphy) == 10);
    checkFirst(*reinterpret_cast<const Gen4StaticPackedState *>(gen4static_result_ptr()), 3917348864,
               { 17, 19, 20, 13, 12, 16 }, 14, 4, 31, 0, 0);

    const Encounter gyarados = { 130, 30, 127, Gen4ShinyAlways };
    assert(generate(1431655765, Gen4Method1, Gen4LeadNone, 0, gyarados) == 10);
    const auto *state = reinterpret_cast<const Gen4StaticPackedState *>(gen4static_result_ptr());
    checkFirst(*state, 226879883, { 10, 9, 0, 15, 4, 26 }, 8, 4, 45, 1, 31);
    assert(state->shiny == 1);

    const Encounter registeel = { 379, 30, 255, Gen4ShinyRandom };
    assert(generate(0, Gen4MethodJ, Gen4LeadNone, 0, registeel) == 10);
    checkFirst(*reinterpret_cast<const Gen4StaticPackedState *>(gen4static_result_ptr()), 3552946825,
               { 10, 31, 16, 22, 0, 25 }, 0, 2, 42, 0, 0);

    const Encounter heatran = { 485, 50, 127, Gen4ShinyRandom };
    assert(generate(1431655765, Gen4MethodJ, Gen4LeadCuteCharmF, 0, heatran) == 10);
    checkFirst(*reinterpret_cast<const Gen4StaticPackedState *>(gen4static_result_ptr()), 166,
               { 17, 7, 31, 29, 13, 14 }, 16, 13, 38, 1, 31);

    const Encounter giratina = { 487, 47, 255, Gen4ShinyRandom };
    assert(generate(2863311530, Gen4MethodJ, Gen4LeadSynchronize, 10, giratina) == 10);
    checkFirst(*reinterpret_cast<const Gen4StaticPackedState *>(gen4static_result_ptr()), 2820292110,
               { 13, 30, 18, 22, 5, 10 }, 10, 7, 49, 1, 62);

    const Encounter articunoHgss = { 144, 50, 255, Gen4ShinyRandom };
    assert(generate(0, Gen4MethodK, Gen4LeadNone, 0, articunoHgss) == 10);
    checkFirst(*reinterpret_cast<const Gen4StaticPackedState *>(gen4static_result_ptr()), 3552946825,
               { 10, 31, 16, 22, 0, 25 }, 0, 2, 42, 0, 0);

    const Encounter lapras = { 131, 20, 127, Gen4ShinyRandom };
    assert(generate(1431655765, Gen4MethodK, Gen4LeadCuteCharmF, 0, lapras) == 10);
    checkFirst(*reinterpret_cast<const Gen4StaticPackedState *>(gen4static_result_ptr()), 165,
               { 17, 7, 31, 29, 13, 14 }, 15, 13, 38, 1, 31);

    const Encounter hoOh = { 250, 45, 255, Gen4ShinyRandom };
    assert(generate(2863311530, Gen4MethodK, Gen4LeadSynchronize, 0, hoOh) == 10);
    checkFirst(*reinterpret_cast<const Gen4StaticPackedState *>(gen4static_result_ptr()), 3223499725,
               { 10, 24, 26, 22, 19, 10 }, 0, 7, 68, 1, 62);

    const Encounter articunoRoamer = { 144, 60, 255, Gen4ShinyRandom };
    assert(search(Gen4Method1, Gen4LeadNone, manaphy) == 12);
    assert(search(Gen4Method1, Gen4LeadNone, gyarados) == 12);
    assert(search(Gen4Method1, Gen4LeadNone, articunoRoamer) == 12);
    assert(search(Gen4MethodJ, Gen4LeadNone, registeel) == 33);
    assert(search(Gen4MethodJ, Gen4LeadCuteCharmF, heatran) == 11);
    assert(search(Gen4MethodJ, Gen4LeadSynchronize, giratina) == 417);
    assert(search(Gen4MethodK, Gen4LeadNone, articunoHgss) == 65);
    assert(search(Gen4MethodK, Gen4LeadCuteCharmF, lapras) == 6);
    assert(search(Gen4MethodK, Gen4LeadSynchronize, hoOh) == 429);

    assert(generate(0, 9, Gen4LeadNone, 0, manaphy) == 0);
    assert(gen4static_last_error() == 1);
    return 0;
}

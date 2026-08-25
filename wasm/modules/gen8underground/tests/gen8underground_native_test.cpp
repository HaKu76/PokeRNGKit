/*
 * PokeRNGKit Gen VIII Underground native parity fixture.
 * Derived from PokeFinder 4.3.2 UndergroundGenerator tests.
 * GPL-3.0-or-later.
 */
#include "gen8underground_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>

namespace
{
    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    std::array<std::uint32_t, 56> request(std::uint32_t lead = 255, bool diglett = false, std::uint32_t storyFlag = 1)
    {
        std::array<std::uint32_t, 56> value = {};
        value[0] = 0x87654321;
        value[1] = 0x12345678;
        value[2] = 0x12345678;
        value[3] = 0x87654321;
        value[6] = 10;
        value[7] = 12345;
        value[8] = 54321;
        value[10] = storyFlag;
        value[11] = 2;
        value[12] = diglett ? 1 : 0;
        value[14] = lead;
        value[16] = 255;
        value[17] = 255;
        value[18] = 255;
        value[19] = 0x1ffffff;
        value[21] = 255;
        value[23] = 255;
        for (std::size_t index = 0; index < 6; index++) value[30 + index] = 31;
        value[36] = 31;
        value[37] = 0;
        for (std::size_t index = 0; index < 16; index++) value[38 + index] = 0xffffffff;
        value[55] = 1000;
        return value;
    }

    const std::uint32_t *row(const std::uint32_t *output, std::size_t index)
    {
        return output + index * 12;
    }

    std::array<std::uint8_t, 6> ivs(const std::uint32_t *output)
    {
        return { static_cast<std::uint8_t>(output[5]), static_cast<std::uint8_t>(output[5] >> 8),
                 static_cast<std::uint8_t>(output[5] >> 16), static_cast<std::uint8_t>(output[5] >> 24),
                 static_cast<std::uint8_t>(output[6]), static_cast<std::uint8_t>(output[6] >> 8) };
    }

    bool fixture(std::array<std::uint32_t, 56> value, std::uint32_t expectedEc, std::uint32_t expectedPid,
                 std::uint16_t expectedSpecies, std::uint16_t expectedEggMove, std::uint8_t expectedLevel,
                 std::array<std::uint8_t, 6> expectedIvs, const char *message)
    {
        if (!check(gen8underground_generate(value.data()) == 60, message)) return false;
        if (!check(gen8underground_processed_count() == 10, "processed frame count mismatch")) return false;
        const auto *output = reinterpret_cast<const std::uint32_t *>(gen8underground_result_ptr());
        const std::uint16_t species = static_cast<std::uint16_t>(output[4] & 0x3ff);
        const std::uint8_t level = static_cast<std::uint8_t>((output[4] >> 10) & 0x7f);
        return check(output[1] == expectedEc && output[2] == expectedPid && species == expectedSpecies
                         && static_cast<std::uint16_t>(output[3]) == expectedEggMove && level == expectedLevel
                         && ivs(output) == expectedIvs,
                     "fixture first row mismatch");
    }
}

int main()
{
    if (!check(gen8underground_api_version() == 2, "unexpected API version")) return 1;
    if (!fixture(request(), 2173469342U, 3329595061U, 198, 413, 17, { 28, 1, 23, 10, 31, 20 }, "None fixture count mismatch"))
        return 1;
    if (!fixture(request(255, true, 6), 2173469342U, 780827324U, 434, 583, 17, { 1, 23, 10, 31, 20, 26 },
                 "Diglett fixture count mismatch"))
        return 1;
    if (!fixture(request(34, false, 6), 2173469342U, 3329595061U, 434, 492, 17, { 28, 1, 23, 10, 31, 20 },
                 "Compound Eyes fixture count mismatch"))
        return 1;
    if (!fixture(request(25, false, 6), 2173469342U, 3329595061U, 434, 583, 17, { 28, 1, 23, 10, 31, 20 },
                 "Cute Charm fixture count mismatch"))
        return 1;
    if (!fixture(request(32, false, 6), 445535028U, 899823776U, 434, 184, 20, { 21, 28, 1, 23, 10, 31 },
                 "Pressure fixture count mismatch"))
        return 1;
    if (!fixture(request(0, false, 6), 2173469342U, 3329595061U, 434, 184, 17, { 28, 1, 23, 10, 31, 20 },
                 "Synchronize fixture count mismatch"))
        return 1;

    auto value = request();
    value[55] = 1;
    if (!check(gen8underground_generate(value.data()) == 1 && gen8underground_limit_reached() == 1,
               "result limit was not enforced"))
        return 1;
    auto invalid = request();
    invalid[0] = invalid[1] = invalid[2] = invalid[3] = 0;
    if (!check(gen8underground_generate(invalid.data()) == 0 && gen8underground_last_error() == 1,
               "zero seeds were accepted"))
        return 1;
    invalid = request();
    invalid[10] = 7;
    if (!check(gen8underground_generate(invalid.data()) == 0 && gen8underground_last_error() == 1,
               "invalid story flag was accepted"))
        return 1;
    invalid = request();
    invalid[6] = 250000001;
    if (!check(gen8underground_generate(invalid.data()) == 0 && gen8underground_last_error() == 2,
               "range limit returned the wrong error"))
        return 1;

    value = request();
    value[16] = 1U << 2;
    if (!check(gen8underground_generate(value.data()) == 0, "square shiny filter mismatch")) return 1;
    value = request();
    value[15] = 1;
    for (std::size_t index = 0; index < 16; index++) value[38 + index] = 0;
    value[38] = 1;
    if (!check(gen8underground_generate(value.data()) == 60, "disabled filters did not skip species")) return 1;

    return 0;
}

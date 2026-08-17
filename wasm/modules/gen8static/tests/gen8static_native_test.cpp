/*
 * PokeRNGKit Gen VIII Static native parity fixture.
 * Derived from PokeFinder 4.3.2 StaticGenerator8 tests.
 * GPL-3.0-or-later.
 */
#include "gen8static_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>
#include <limits>

namespace
{
    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    std::array<std::uint32_t, 41> request()
    {
        std::array<std::uint32_t, 41> value = {};
        value[0] = 0x87654321U;
        value[1] = 0x12345678U;
        value[2] = 0x12345678U;
        value[3] = 0x87654321U;
        value[7] = 10;
        value[8] = 12345;
        value[9] = 54321;
        value[10] = 387;
        value[12] = 0;
        value[13] = 255;
        value[15] = 5;
        value[18] = 255;
        value[19] = 1;
        value[20] = 255;
        value[21] = 255;
        value[22] = 255;
        value[23] = 0x1ffffff;
        value[25] = 255;
        value[27] = 255;
        for (std::size_t index = 0; index < 6; index++) value[34 + index] = 31;
        value[40] = 100;
        return value;
    }

    std::array<std::uint8_t, 6> unpackIvs(const std::uint32_t *result)
    {
        return { static_cast<std::uint8_t>(result[5]), static_cast<std::uint8_t>(result[5] >> 8),
                 static_cast<std::uint8_t>(result[5] >> 16), static_cast<std::uint8_t>(result[5] >> 24),
                 static_cast<std::uint8_t>(result[6]), static_cast<std::uint8_t>(result[6] >> 8) };
    }

    std::uint32_t iterativeEc(std::uint64_t seed0, std::uint64_t seed1, std::uint32_t advances)
    {
        std::array<std::uint32_t, 4> state = { static_cast<std::uint32_t>(seed0 >> 32), static_cast<std::uint32_t>(seed0),
                                               static_cast<std::uint32_t>(seed1 >> 32), static_cast<std::uint32_t>(seed1) };
        const auto next = [&state] {
            std::uint32_t value = state[0];
            const std::uint32_t last = state[3];
            value ^= value << 11;
            value ^= value >> 8;
            value ^= last ^ (last >> 19);
            state[0] = state[1];
            state[1] = state[2];
            state[2] = state[3];
            state[3] = value;
            return value;
        };
        for (std::uint32_t index = 0; index < advances; index++) next();
        return (next() % 0xffffffffU) + 0x80000000U;
    }
}

int main()
{
    if (!check(gen8static_api_version() == 1, "unexpected API version")) return 1;

    auto value = request();
    if (!check(gen8static_generate(value.data()) == 10, "Turtwig result count mismatch")) return 1;
    if (!check(gen8static_processed_count() == 10, "Turtwig processed count mismatch")) return 1;
    const auto *output = reinterpret_cast<const std::uint32_t *>(gen8static_result_ptr());
    if (!check(output != nullptr, "Turtwig result pointer was null")) return 1;
    if (!check(output[0] == 0 && output[1] == 570639824U && output[2] == 570642538U,
               "Turtwig first frame identity mismatch"))
        return 1;
    if (!check(unpackIvs(output) == std::array<std::uint8_t, 6>{ 4, 23, 15, 30, 19, 26 },
               "Turtwig first frame IV mismatch"))
        return 1;
    if (!check((output[3] & 3U) == 0 && ((output[3] >> 4) & 0x1fU) == 22
                   && ((output[3] >> 11) & 0x1fU) == 20 && output[7] == 65,
               "Turtwig first frame metadata mismatch"))
        return 1;

    const auto *last = output + 9 * 11;
    if (!check(last[0] == 9 && last[1] == 3906296370U && last[2] == 267060347U,
               "Turtwig last frame identity mismatch"))
        return 1;
    if (!check(unpackIvs(last) == std::array<std::uint8_t, 6>{ 16, 12, 0, 15, 29, 20 },
               "Turtwig last frame IV mismatch"))
        return 1;

    value = request();
    value[10] = 138;
    value[14] = 3;
    value[15] = 1;
    if (!check(gen8static_generate(value.data()) == 10, "Omanyte result count mismatch")) return 1;
    output = reinterpret_cast<const std::uint32_t *>(gen8static_result_ptr());
    if (!check(unpackIvs(output) == std::array<std::uint8_t, 6>{ 30, 31, 31, 19, 26, 31 }
                   && output[7] == 33 && ((output[3] >> 11) & 0x1fU) == 11,
               "Omanyte first frame mismatch"))
        return 1;

    value = request();
    value[10] = 485;
    value[14] = 3;
    value[15] = 70;
    value[18] = 25;
    if (!check(gen8static_generate(value.data()) == 10, "Heatran result count mismatch")) return 1;
    output = reinterpret_cast<const std::uint32_t *>(gen8static_result_ptr());
    if (!check(((output[3] >> 2) & 3U) == 0 && output[7] == 18, "Heatran Cute Charm mismatch")) return 1;

    value = request();
    value[10] = 144;
    value[13] = 2;
    value[14] = 3;
    value[15] = 70;
    value[18] = 0;
    if (!check(gen8static_generate(value.data()) == 10, "Articuno result count mismatch")) return 1;
    output = reinterpret_cast<const std::uint32_t *>(gen8static_result_ptr());
    if (!check((output[3] & 3U) == 2 && ((output[3] >> 4) & 0x1fU) == 0 && output[7] == 81,
               "Articuno Synchronize/ability mismatch"))
        return 1;

    value = request();
    value[10] = 385;
    value[12] = 1;
    value[13] = 1;
    value[14] = 3;
    value[15] = 5;
    value[16] = 1;
    if (!check(gen8static_generate(value.data()) == 10, "Jirachi result count mismatch")) return 1;
    output = reinterpret_cast<const std::uint32_t *>(gen8static_result_ptr());
    if (!check((output[3] & 3U) == 1 && ((output[3] >> 9) & 3U) == 0 && output[7] == 32,
               "Jirachi fixed template mismatch"))
        return 1;

    value = request();
    value[10] = 481;
    value[14] = 3;
    value[15] = 50;
    value[17] = 1;
    if (!check(gen8static_generate(value.data()) == 10, "Mesprit result count mismatch")) return 1;
    output = reinterpret_cast<const std::uint32_t *>(gen8static_result_ptr());
    if (!check(output[1] == 570639824U && output[2] == 408037119U
                   && unpackIvs(output) == std::array<std::uint8_t, 6>{ 13, 31, 7, 3, 31, 31 }
                   && ((output[3] >> 2) & 3U) == 2 && output[7] == 26,
               "Mesprit first frame mismatch"))
        return 1;

    value = request();
    value[10] = 488;
    value[14] = 3;
    value[15] = 50;
    value[17] = 1;
    if (!check(gen8static_generate(value.data()) == 10, "Cresselia result count mismatch")) return 1;
    output = reinterpret_cast<const std::uint32_t *>(gen8static_result_ptr());
    if (!check(((output[3] >> 2) & 3U) == 1 && output[7] == 26, "Cresselia fixed gender mismatch")) return 1;

    value = request();
    value[4] = 1000000;
    value[7] = 1;
    const std::uint32_t expectedEc = iterativeEc(0x1234567887654321ULL, 0x8765432112345678ULL, value[4]);
    if (!check(gen8static_generate(value.data()) == 1, "high advance result count mismatch")) return 1;
    output = reinterpret_cast<const std::uint32_t *>(gen8static_result_ptr());
    if (!check(output[0] == 1000000 && output[1] == expectedEc, "Xorshift jump mismatch")) return 1;

    auto invalid = request();
    invalid[0] = invalid[1] = invalid[2] = invalid[3] = 0;
    if (!check(gen8static_generate(invalid.data()) == 0 && gen8static_last_error() == 1,
               "zero seeds were accepted"))
        return 1;
    invalid = request();
    invalid[4] = std::numeric_limits<std::uint32_t>::max();
    invalid[7] = 2;
    if (!check(gen8static_generate(invalid.data()) == 0 && gen8static_last_error() == 1,
               "advance overflow was accepted"))
        return 1;
    invalid = request();
    invalid[6] = 250000000;
    invalid[7] = 1;
    if (!check(gen8static_generate(invalid.data()) == 0 && gen8static_last_error() == 2,
               "range limit returned the wrong error"))
        return 1;
    auto limited = request();
    limited[40] = 1;
    if (!check(gen8static_generate(limited.data()) == 1 && gen8static_limit_reached() == 1,
               "result limit was not enforced"))
        return 1;

    return 0;
}

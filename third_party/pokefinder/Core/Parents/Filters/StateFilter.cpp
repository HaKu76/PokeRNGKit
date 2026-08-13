/*
 * This file is part of PokéFinder
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 3
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
#include "StateFilter.hpp"
#include <Core/Parents/States/State.hpp>
#include <Core/Parents/States/WildState.hpp>

StateFilter::StateFilter(u8 gender, u8 ability, u8 shiny, u8 heightMin, u8 heightMax, u8 weightMin, u8 weightMax, bool skip,
                         const std::array<u8, 6> &ivMin, const std::array<u8, 6> &ivMax, const std::array<bool, 25> &natures,
                         const std::array<bool, 16> &powers) :
    skip(skip), natures(natures), powers(powers), ivMax(ivMax), ivMin(ivMin), ability(ability), gender(gender),
    heightMax(heightMax), heightMin(heightMin), shiny(shiny), weightMax(weightMax), weightMin(weightMin)
{
}

bool StateFilter::compareAbility(u8 value) const { return skip || ability == 255 || ability == value; }
bool StateFilter::compareGender(u8 value) const { return skip || gender == 255 || gender == value; }
bool StateFilter::compareHiddenPower(u8 value) const { return skip || powers[value]; }
bool StateFilter::compareNature(u8 value) const { return skip || natures[value]; }
bool StateFilter::compareShiny(u8 value) const { return skip || shiny == 255 || (shiny & value) != 0; }

bool StateFilter::compareIV(const std::array<u8, 6> &values) const
{
    if (skip) return true;
    for (int index = 0; index < 6; index++)
    {
        if (values[index] < ivMin[index] || values[index] > ivMax[index]) return false;
    }
    return true;
}

bool StateFilter::compareState(const State &state) const
{
    return compareAbility(state.getAbility()) && compareGender(state.getGender()) && compareHiddenPower(state.getHiddenPower())
        && compareNature(state.getNature()) && compareShiny(state.getShiny()) && compareIV(state.getIVs());
}

bool WildStateFilter::compareState(const WildGeneratorState &state) const
{
    return compareAbility(state.getAbility()) && compareGender(state.getGender()) && compareHiddenPower(state.getHiddenPower())
        && compareShiny(state.getShiny()) && compareIV(state.getIVs());
}

bool WildStateFilter::compareState(const WildSearcherState &state) const
{
    return compareAbility(state.getAbility()) && compareGender(state.getGender()) && compareHiddenPower(state.getHiddenPower())
        && compareShiny(state.getShiny());
}

WildStateFilter::WildStateFilter(u8 gender, u8 ability, u8 shiny, u8 heightMin, u8 heightMax, u8 weightMin, u8 weightMax, bool skip,
                                 const std::array<u8, 6> &ivMin, const std::array<u8, 6> &ivMax, const std::array<bool, 25> &natures,
                                 const std::array<bool, 16> &powers, const std::array<bool, 12> &encounterSlots) :
    StateFilter(gender, ability, shiny, heightMin, heightMax, weightMin, weightMax, skip, ivMin, ivMax, natures, powers),
    encounterSlots(encounterSlots)
{
}

bool WildStateFilter::compareEncounterSlot(u8 value) const { return skip || encounterSlots[value]; }

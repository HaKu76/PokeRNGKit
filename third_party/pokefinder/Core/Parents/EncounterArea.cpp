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
#include "EncounterArea.hpp"
#include <Core/Enum/Lead.hpp>
#include <Core/Parents/PersonalInfo.hpp>
#include <algorithm>

EncounterArea::EncounterArea(u8 location, u8 rate, Encounter encounter, const std::array<Slot, 12> &pokemon) :
    pokemon(pokemon), encounter(encounter), location(location), rate(rate)
{
}

u8 EncounterArea::getCount() const
{
    return static_cast<u8>(std::count_if(pokemon.begin(), pokemon.end(), [](const Slot &slot) { return slot.getSpecie() != 0; }));
}

std::pair<u8, u8> EncounterArea::getLevelRange(u16 specie) const
{
    std::pair<u8, u8> range { 100, 0 };
    for (const Slot &slot : pokemon)
    {
        if (slot.getSpecie() == specie)
        {
            range.first = std::min(range.first, slot.getMinLevel());
            range.second = std::max(range.second, slot.getMaxLevel());
        }
    }
    return range;
}

std::vector<bool> EncounterArea::getSlots(u16 specie) const
{
    std::vector<bool> flags(pokemon.size());
    for (std::size_t index = 0; index < pokemon.size() && pokemon[index].getSpecie() != 0; index++)
    {
        flags[index] = pokemon[index].getSpecie() == (specie & 0x7ff) && pokemon[index].getForm() == (specie >> 11);
    }
    return flags;
}

ModifiedSlots EncounterArea::getSlots(Lead lead) const
{
    ModifiedSlots modified {};
    u8 type = 0;
    switch (lead)
    {
    case Lead::MagnetPull: type = 8; break;
    case Lead::Static: type = 12; break;
    case Lead::Harvest: type = 11; break;
    case Lead::FlashFire: type = 9; break;
    case Lead::StormDrain: type = 10; break;
    default: return modified;
    }
    u8 count = 0;
    for (; count < pokemon.size() && pokemon[count].getInfo() != nullptr; count++)
    {
        const PersonalInfo *info = pokemon[count].getInfo();
        if (info->getType(0) == type || info->getType(1) == type)
        {
            modified.encounters[modified.count++] = count;
        }
    }
    if (modified.count == count)
    {
        modified.count = 0;
    }
    return modified;
}

std::vector<std::string> EncounterArea::getSpecieNames() const
{
    std::vector<std::string> names;
    for (u16 species : getUniqueSpecies())
    {
        names.emplace_back(std::to_string(species & 0x7ff));
    }
    return names;
}

std::vector<u16> EncounterArea::getUniqueSpecies() const
{
    std::vector<u16> species;
    for (const Slot &slot : pokemon)
    {
        if (slot.getSpecie() == 0)
        {
            continue;
        }
        const u16 value = static_cast<u16>((slot.getForm() << 11) | slot.getSpecie());
        if (std::find(species.begin(), species.end(), value) == species.end())
        {
            species.emplace_back(value);
        }
    }
    return species;
}

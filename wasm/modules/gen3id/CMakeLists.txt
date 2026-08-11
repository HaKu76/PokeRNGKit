set(
    ID3_CORE_SOURCES
    "${POKEFINDER_ROOT}/Core/Gen3/Generators/IDGenerator3.cpp"
    "${POKEFINDER_ROOT}/Core/Parents/Filters/IDFilter.cpp"
)

add_library(pokefinder_gen3id STATIC ${ID3_CORE_SOURCES})
target_include_directories(pokefinder_gen3id PUBLIC "${POKEFINDER_ROOT}")

if(EMSCRIPTEN)
    add_executable(gen3id bridge/gen3id_bridge.cpp)
    target_include_directories(gen3id PRIVATE bridge)
    target_link_libraries(gen3id PRIVATE pokefinder_gen3id)
    target_compile_options(pokefinder_gen3id PRIVATE "-O3")
    target_compile_options(gen3id PRIVATE "-O3")
    target_link_options(
        gen3id
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3IdModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen3id_api_version','_gen3id_generate','_gen3id_search','_gen3id_result_ptr','_gen3id_result_count','_gen3id_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen3id
        PROPERTIES
        OUTPUT_NAME "gen3id"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen3id_native_test bridge/gen3id_bridge.cpp tests/id3_native_test.cpp)
    target_include_directories(gen3id_native_test PRIVATE bridge)
    target_link_libraries(gen3id_native_test PRIVATE pokefinder_gen3id)
    add_test(NAME gen3id_native_parity COMMAND gen3id_native_test)
endif()

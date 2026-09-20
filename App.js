import { useState, useEffect } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  List,
  PaperProvider,
  Switch,
  Text,
  MD3LightTheme as DefaultTheme,
} from "react-native-paper";
import myColors from "./assets/colors.json";
import myColorsDark from "./assets/colorsDark.json";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';

// Abre (ou cria) o banco de dados
const db = SQLite.openDatabaseSync('minhas_localizacoes.db');

// Cria a tabela caso ela não exista
function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL
    );
  `);
}

export default function App() {
  const [isSwitchOn, setIsSwitchOn] = useState(false); // controle do darkMode
  const [isLoading, setIsLoading] = useState(false); // controle do loading do button
  const [locations, setLocations] = useState([]); // armazenar as localizações (alterado para array vazio)

  // Carrega tema default da lib RN PAPER com customização
  const [theme, setTheme] = useState({
    ...DefaultTheme,
    myOwnProperty: true,
    colors: myColors.colors,
  });

  // load darkMode from AsyncStorage
  async function loadDarkMode() {
    try {
      const value = await AsyncStorage.getItem('@colorMode');
      if(value !== null) {
        setIsSwitchOn(JSON.parse(value));
      }
    } catch (e) {
      console.log("Erro ao carregar tema:", e);
    }
  }

  // darkMode switch event
  async function onToggleSwitch() {
    try {
      const nextValue = !isSwitchOn;
      setIsSwitchOn(nextValue);
      await AsyncStorage.setItem('@colorMode', JSON.stringify(nextValue));
    } catch (e) {
      console.log("Erro ao salvar tema:", e);
    }
  }

  // get location (botão capturar localização)
  async function getLocation() {
    setIsLoading(true);

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Precisamos da permissão de localização para funcionar!');
        setIsLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const long = location.coords.longitude;

      await db.runAsync(
        'INSERT INTO locations (latitude, longitude) VALUES (?, ?);',
        [lat, long]
      );

      await loadLocations();

    } catch (error) {
      console.log("Erro ao capturar localização:", error);
      alert("Erro ao buscar GPS. Verifique se a localização está ativa.");
    } finally {
      setIsLoading(false);
    }
  }

  // load locations from db sqlite
  async function loadLocations() {
    setIsLoading(true);
    try {
      const allRows = await db.getAllAsync('SELECT * FROM locations ORDER BY id DESC;');
      setLocations(allRows);
    } catch (error) {
      console.log("Erro ao carregar do banco:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Executado ao abrir o App
  useEffect(() => {
    initDB();
    loadDarkMode();
    loadLocations();
  }, []);

  // Efetiva a alteração do tema dark/light
  useEffect(() => {
    if (isSwitchOn) {
      setTheme({ ...theme, colors: myColorsDark.colors });
    } else {
      setTheme({ ...theme, colors: myColors.colors });
    }
  }, [isSwitchOn]);

  return (
    <PaperProvider theme={theme}>
      <Appbar.Header>
        <Appbar.Content title="My Location"/>
      </Appbar.Header>
      
      {/* O flex: 1 abaixo garante que o tema pinte a tela toda */}
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={styles.containerDarkMode}>
          <Text style={{ color: theme.colors.onBackground }}>Dark Mode</Text>
          <Switch value={isSwitchOn} onValueChange={onToggleSwitch} />
        </View>
        
        <Button
          style={styles.containerButton}
          mode="contained"
          loading={isLoading}
          onPress={() => getLocation()}
        >
          Capturar localização
        </Button>

        <FlatList
          style={styles.containerList}
          data={locations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <List.Item
              title={`Localização ${item.id}`}
              description={`Latitude: ${item.latitude} | Longitude: ${item.longitude}`}
              titleStyle={{ color: theme.colors.onBackground }}
              descriptionStyle={{ color: theme.colors.onBackground }}
            />
          )}
        />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  containerDarkMode: {
    margin: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  containerButton: {
    margin: 10,
  },
  containerList: {
    margin: 10,
    flex: 1,
  },
});
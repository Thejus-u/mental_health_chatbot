import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';

const BubblePop = () => {
    const [bubbles, setBubbles] = useState([]);
    
    useEffect(() => {
        createBubble();
    }, []);

    const createBubble = () => {
        const newBubble = {
            id: Date.now(),
            x: Math.random() * (width - 60),
            y: Math.random() * (height - 60),
            scale: new Animated.Value(0),
            opacity: new Animated.Value(1),
        };

        setBubbles([...bubbles, newBubble]);

        Animated.spring(newBubble.scale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();

        setTimeout(createBubble, Math.random() * 1000 + 500);
    };

    const popBubble = (id) => {
        const bubble = bubbles.find(b => b.id === id);
        
        Animated.parallel([
            Animated.spring(bubble.scale, {
                toValue: 1.5,
                useNativeDriver: true,
            }),
            Animated.timing(bubble.opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setBubbles(bubbles.filter(b => b.id !== id));
        });
    };

    return (
        <View style={styles.container}>
            {bubbles.map(bubble => (
                <Animated.View
                    key={bubble.id}
                    style={[
                        styles.bubble,
                        {
                            left: bubble.x,
                            top: bubble.y,
                            transform: [{ scale: bubble.scale }],
                            opacity: bubble.opacity,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.bubbleTouch}
                        onPress={() => popBubble(bubble.id)}
                    />
                </Animated.View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#171923',
    },
    bubble: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#7F5AF0',
    },
    bubbleTouch: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
    },
});

export default BubblePop;